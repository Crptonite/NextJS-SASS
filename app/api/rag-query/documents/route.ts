import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

// GET documents or single document
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (id) {
      // fetch single document chunks
      const chunks = await sql`
        SELECT content, metadata
        FROM documents
        WHERE metadata->>'document_id' = ${id}
        ORDER BY (metadata->>'chunk_index')::int ASC
      `;

      if (!chunks || chunks.length === 0) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }

      const m = chunks[0].metadata || {};

      return NextResponse.json({
        id,
        file_name: m.file_name || "Unknown",
        file_type: m.file_type || "unknown",
        file_size: m.file_size || 0,
        upload_date: m.upload_date || new Date().toISOString(),
        total_chunks: chunks.length,
        fullText: chunks.map((c: any) => c.content).join("\n\n"),
        file_path: m.file_path,
      });
    }

    // list all documents (deduplicate by document_id)
    const allDocs = await sql`SELECT metadata FROM documents`;
    const map = new Map<string, any>();
    allDocs.forEach((doc: any) => {
      const m = doc.metadata;
      if (m?.document_id && !map.has(m.document_id)) {
        map.set(m.document_id, {
          id: m.document_id,
          file_name: m.file_name,
          file_type: m.file_type,
          file_size: m.file_size,
          upload_date: m.upload_date,
          total_chunks: m.total_chunks,
          file_path: m.file_path,
        });
      }
    });

    return NextResponse.json({ documents: Array.from(map.values()) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE a document
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Document id required" }, { status: 400 });
    }

    // Remove file_path from metadata (optional if you want to clear it before deletion)
    await sql`
      UPDATE documents
      SET metadata = metadata - 'file_path'
      WHERE metadata->>'document_id' = ${id}
    `;

    // Delete all chunks for this document
    await sql`
      DELETE FROM documents
      WHERE metadata->>'document_id' = ${id}
    `;

    return NextResponse.json({ success: true, message: "Document deleted and file_path cleared" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}