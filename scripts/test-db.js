/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY before running the database check.');
}

const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

async function applySchema() {
  console.log('Applying schema to Supabase...');

  // Test connection first
  const { data, error: connErr } = await supabase.from('bug_boxes').select('count').limit(1);
  
  if (connErr && connErr.code === '42P01') {
    console.log('Tables do not exist yet - this is expected. Please apply schema.sql in Supabase SQL Editor.');
    console.log('URL: https://supabase.com/dashboard/project/vjshitjyvkwjxabnxlzp/sql');
  } else if (connErr) {
    console.error('Connection error:', connErr.message);
  } else {
    console.log('Tables already exist! Connection successful.');
    console.log('Data:', data);
  }

  // Test inserting a bug box
  const { data: testBox, error: insertErr } = await supabase
    .from('bug_boxes')
    .insert({
      title: 'Test: POST /api/login returns HTTP 500 after valid credentials',
      description: 'Login button fails with HTTP 500. Console shows database connection error.',
      severity: 'HIGH',
      status: 'Captured',
    })
    .select()
    .single();

  if (insertErr) {
    console.error('Insert error:', insertErr.message, insertErr.code);
  } else {
    console.log('Successfully inserted test bug box!');
    console.log('ID:', testBox.id);
    console.log('Share token:', testBox.share_token);

    // Clean it up
    await supabase.from('bug_boxes').delete().eq('id', testBox.id);
    console.log('Cleaned up test record.');
  }
}

applySchema().catch(console.error);
