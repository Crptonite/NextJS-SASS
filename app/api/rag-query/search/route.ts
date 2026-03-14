import { neon } from '@neondatabase/serverless';
import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    // Generate embedding
    const emb = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    const embedding = emb.data[0].embedding;

    // Run vector similarity search using Neon
    const results = await sql`
      SELECT *
      FROM match_documents(
        ${JSON.stringify(embedding)}::vector,
        0.0,
        5
      );
    `;

    // Combine context
    const context =
      results?.map((r: any) => r.content).join('\n---\n') || '';

    // Generate answer
    const completion = await openai.chat.completions.create({
      model: 'text-embedding-3-small',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant. Use the provided context to answer questions. If the answer is not in the context, say you do not know.',
        },
        {
          role: 'user',
          content: `Context: ${context}\n\nQuestion: ${query}`,
        },
      ],
    });

    return NextResponse.json({
      answer: completion.choices[0].message.content,
      sources: results,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}