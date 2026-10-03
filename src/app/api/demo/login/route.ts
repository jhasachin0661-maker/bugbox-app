import { NextRequest, NextResponse } from 'next/server';

/**
 * DEMO APP — Intentionally broken login endpoint.
 * 
 * This is used for the hackathon demo to produce a deterministic HTTP 500.
 * Valid credentials: demo@bugbox.dev / demo123
 * Invalid credentials: any other values → HTTP 401
 * Server error trigger: admin@bugbox.dev → HTTP 500 (simulated server bug)
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, password } = body;

  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 600));

  // Always return 500 for the demo email to demonstrate the bug
  if (email === 'user@demo.com') {
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Database connection timeout',
        stack: 'Error: Connection pool exhausted\n  at getConnection (/app/db.js:42)\n  at authenticateUser (/app/auth.js:18)',
      },
      { status: 500 }
    );
  }

  // 401 for wrong credentials
  if (email !== 'demo@bugbox.dev' || password !== 'demo123') {
    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }

  // Successful login (rarely reached in demo)
  return NextResponse.json({
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo.signature',
    user: { id: '1', email, name: 'Demo User' },
  });
}
