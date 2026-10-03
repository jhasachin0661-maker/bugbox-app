import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateReproductionSteps } from '@/lib/redact';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Fetch bug box and session events
    const { data: bugBox } = await supabase
      .from('bug_boxes')
      .select('*')
      .eq('id', id)
      .single();

    if (!bugBox) {
      return NextResponse.json({ error: 'Bug box not found' }, { status: 404 });
    }

    const { data: sessions } = await supabase
      .from('sessions')
      .select('*')
      .eq('bug_box_id', id)
      .limit(1);

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ error: 'No session found for this bug box' }, { status: 404 });
    }

    const session = sessions[0];

    // Fetch events for replay script generation
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('session_id', session.id)
      .order('timestamp');

    // Create replay record
    const { data: replay, error: replayError } = await supabase
      .from('replays')
      .insert({
        bug_box_id: id,
        status: 'RUNNING',
      })
      .select()
      .single();

    if (replayError) {
      return NextResponse.json({ error: replayError.message }, { status: 500 });
    }

    // Generate the proposed replay steps. Execution must happen in a configured
    // worker; this API must never report a simulated browser run as real.
    const steps = generateReproductionSteps(
      (events || []).map((e) => ({
        type: e.type,
        target: e.target,
        metadata: e.metadata,
      }))
    );

    const workerUrl = process.env.REPLAY_WORKER_URL;
    if (!workerUrl) {
      await supabase.from('replays').update({ status: 'FAILED', completed_at: new Date().toISOString(), result: { steps, error: 'Replay worker is not configured. No browser execution was performed.' } }).eq('id', replay.id);
      return NextResponse.json({ error: 'Replay worker is not configured. Set REPLAY_WORKER_URL to enable real Playwright replay.', replay_id: replay.id, steps }, { status: 503 });
    }

    const workerResponse = await fetch(`${workerUrl.replace(/\/$/, '')}/replay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(process.env.REPLAY_WORKER_TOKEN ? { Authorization: `Bearer ${process.env.REPLAY_WORKER_TOKEN}` } : {}) },
      body: JSON.stringify({ bugBoxId: id }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!workerResponse.ok) throw new Error(`Replay worker returned HTTP ${workerResponse.status}`);
    const workerResult = await workerResponse.json() as { replayId?: string; status?: string; steps?: unknown[]; error?: string; reproduced?: boolean };
    if (workerResult.status === 'QUEUED' || workerResult.status === 'RUNNING') {
      await supabase.from('replays').update({ result: { worker_replay_id: workerResult.replayId, steps } }).eq('id', replay.id);
      return NextResponse.json({ replay_id: replay.id, worker_replay_id: workerResult.replayId, status: workerResult.status, steps }, { status: 202 });
    }
    const replaySteps = workerResult.steps || steps.map((action) => ({ action, status: 'pending' as const }));
    const finalStatus = workerResult.error ? 'FAILED' : 'SUCCESS';

    await supabase
      .from('replays')
      .update({
        completed_at: new Date().toISOString(),
        status: finalStatus,
        result: { steps: replaySteps, ...(workerResult.error ? { error: workerResult.error } : {}) },
      })
      .eq('id', replay.id);

    // Update bug box status to Reproducible
    await supabase
      .from('bug_boxes')
      .update({ status: 'Reproducible', updated_at: new Date().toISOString() })
      .eq('id', id);

    return NextResponse.json({
      replay_id: replay.id,
      status: finalStatus,
      steps: replaySteps,
    });
  } catch (err) {
    console.error('Unexpected error in /api/bugs/[id]/replay POST:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
