import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Fetch bug box by ID or share_token
    const { data: bugBox, error: bbError } = await supabase
      .from('bug_boxes')
      .select('*')
      .or(`id.eq.${id},share_token.eq.${id}`)
      .single();

    if (bbError || !bugBox) {
      return NextResponse.json({ error: 'Bug box not found' }, { status: 404 });
    }

    // Fetch session
    const { data: sessions } = await supabase
      .from('sessions')
      .select('*')
      .eq('bug_box_id', bugBox.id)
      .order('started_at', { ascending: false })
      .limit(1);

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ bug_box: bugBox, session: null });
    }

    const session = sessions[0];

    // Fetch all associated data in parallel
    const [
      { data: events },
      { data: networkEvents },
      { data: consoleEvents },
      { data: screenshots },
      { data: replays },
    ] = await Promise.all([
      supabase.from('events').select('*').eq('session_id', session.id).order('timestamp'),
      supabase.from('network_events').select('*').eq('session_id', session.id).order('timestamp'),
      supabase.from('console_events').select('*').eq('session_id', session.id).order('timestamp'),
      supabase.from('screenshots').select('*').eq('session_id', session.id).order('timestamp'),
      supabase.from('replays').select('*').eq('bug_box_id', bugBox.id).order('started_at', { ascending: false }).limit(3),
    ]);

    return NextResponse.json({
      bug_box: bugBox,
      session: {
        ...session,
        events: events || [],
        network_events: networkEvents || [],
        console_events: consoleEvents || [],
        screenshots: screenshots || [],
      },
      replays: replays || [],
    });
  } catch (err) {
    console.error('Unexpected error in /api/bugs/[id] GET:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const body = await request.json();

    const allowedFields: Record<string, unknown> = {};
    if (body.status) allowedFields.status = body.status;
    if (body.severity) allowedFields.severity = body.severity;
    if (body.title) allowedFields.title = body.title;
    if (body.description !== undefined) allowedFields.description = body.description;

    const { data, error } = await supabase
      .from('bug_boxes')
      .update({ ...allowedFields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ bug_box: data });
  } catch (err) {
    console.error('Unexpected error in /api/bugs/[id] PATCH:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
