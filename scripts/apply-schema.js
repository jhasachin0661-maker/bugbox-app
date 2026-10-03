/* eslint-disable @typescript-eslint/no-require-imports */
const https = require('https');
const fs = require('fs');
const path = require('path');

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Split the schema into individual statements and execute each one
const schemaPath = path.join(__dirname, '..', 'supabase', 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

// Parse SQL statements (split by semicolons, handling multi-line)
const statements = schema
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql + ';' });
    
    const options = {
      hostname: 'vjshitjyvkwjxabnxlzp.supabase.co',
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function applySchemaViaAPI() {
  if (!SERVICE_ROLE_KEY) {
    throw new Error('Set SUPABASE_SERVICE_ROLE_KEY before running schema setup.');
  }

  console.log(`Found ${statements.length} SQL statements to execute`);
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (!stmt || stmt.startsWith('--')) continue;
    
    console.log(`Executing statement ${i + 1}/${statements.length}:`, stmt.slice(0, 60) + '...');
    
    try {
      const result = await executeSQL(stmt);
      if (result.status >= 400) {
        console.error(`  Error (${result.status}):`, result.body.slice(0, 200));
      } else {
        console.log(`  OK (${result.status})`);
      }
    } catch (err) {
      console.error('  Network error:', err.message);
    }
  }
  
  console.log('\nSchema application complete!');
}

applySchemaViaAPI();
