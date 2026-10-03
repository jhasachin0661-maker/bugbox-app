import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { redactObject, redactHeaders, generateBugTitle } from '@/lib/redact';
import type { SubmitBugBoxPayload } from '@/lib/types';
import { parseSubmitBugBoxPayload } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body: SubmitBugBoxPayload = parseSubmitBugBoxPayload(await request.json());

    const {
      title,
      description,
      severity,
      session: sessionData,
      events,
      network_events,
      console_events,
      screenshot_data_url,
    } = body;

    // Auto-generate title if not provided
    const bugTitle =
      title ||
      generateBugTitle(
        network_events.map((n) => ({
          status: n.status,
          endpoint: n.endpoint,
          method: n.method,
        })),
        console_events.map((c) => ({ level: c.level, message: c.message }))
      );

    // 1. Create bug box
    const { data: bugBox, error: bbError } = await supabase
      .from('bug_boxes')
      .insert({
        title: bugTitle,
        description: description || null,
        severity: severity || 'MEDIUM',
        status: 'Captured',
      })
      .select()
      .single();

    if (bbError) {
      console.error('Bug box creation error:', bbError);
      return NextResponse.json({ error: bbError.message }, { status: 500 });
    }

    // 2. Create session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        bug_box_id: bugBox.id,
        started_at: new Date().toISOString(),
        browser: sessionData.browser,
        os: sessionData.os,
        viewport: sessionData.viewport,
        timezone: sessionData.timezone,
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }

    // 3. Insert events
    if (events.length > 0) {
      const eventRows = events.map((e) => ({
        session_id: session.id,
        timestamp: e.timestamp,
        type: e.type,
        target: e.target,
        metadata: e.metadata ? redactObject(e.metadata) : null,
      }));

      const { error: eventsError } = await supabase.from('events').insert(eventRows);
      if (eventsError) console.error('Events insertion error:', eventsError);
    }

    // 4. Insert network events (with redaction)
    if (network_events.length > 0) {
      const netRows = network_events.map((n) => {
        const redactedPayload = n.payload
          ? (redactObject(n.payload) as Record<string, unknown>)
          : null;
        const redactedHeaders = n.headers ? redactHeaders(n.headers) : null;

        return {
          session_id: session.id,
          timestamp: n.timestamp,
          method: n.method,
          endpoint: n.endpoint,
          status: n.status,
          duration: n.duration,
          request_size: n.request_size || null,
          response_size: n.response_size || null,
          payload_redacted: redactedPayload
            ? { ...redactedPayload, _headers: redactedHeaders }
            : null,
        };
      });

      const { error: netError } = await supabase.from('network_events').insert(netRows);
      if (netError) console.error('Network events insertion error:', netError);
    }

    // 5. Insert console events
    if (console_events.length > 0) {
      const consoleRows = console_events.map((c) => ({
        session_id: session.id,
        timestamp: c.timestamp,
        level: c.level,
        message: c.message.slice(0, 2000), // cap length
        source: c.source || null,
      }));

      const { error: consoleError } = await supabase.from('console_events').insert(consoleRows);
      if (consoleError) console.error('Console events insertion error:', consoleError);
    }

    // 6. Handle screenshot (stored as base64 data URL in storage_url for MVP)
    if (screenshot_data_url) {
      const { error: screenshotError } = await supabase.from('screenshots').insert({
        session_id: session.id,
        timestamp: new Date().toISOString(),
        storage_url: screenshot_data_url,
        viewport: sessionData.viewport,
      });
      if (screenshotError) console.error('Screenshot insertion error:', screenshotError);
    }

    // 7. Update session end time
    await supabase
      .from('sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', session.id);

    return NextResponse.json({
      success: true,
      bug_box_id: bugBox.id,
      share_token: bugBox.share_token,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Unexpected error in /api/bugs POST:', message);
    return NextResponse.json({ error: message }, { status: message.includes('required') || message.includes('Invalid') || message.includes('exceeds') ? 400 : 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';
    const status = searchParams.get('status') || '';
    const severity = searchParams.get('severity') || '';
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    let query = supabase
      .from('bug_boxes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (severity) {
      query = query.eq('severity', severity);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ bug_boxes: data });
  } catch (err) {
    console.error('Unexpected error in /api/bugs GET:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
