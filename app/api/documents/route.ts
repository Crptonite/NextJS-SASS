import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';
const sql = neon(process.env.DATABASE_URL!);
export async function GET(req: Request) {
  const rows = await sql`SELECT metadata FROM documents`;
  return NextResponse.json({ documents: rows });
}