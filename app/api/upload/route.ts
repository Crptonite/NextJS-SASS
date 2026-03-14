import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export const POST = async (req: Request) => {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  // Convert file to buffer
  const buffer = Buffer.from(await file.arrayBuffer());

  // Save metadata in Neon
  const fileName = file.name;
  const fileType = file.type;
  const fileSize = buffer.length;


await sql`
  INSERT INTO documents (metadata, content)
  VALUES (
    ${JSON.stringify({
      document_id: crypto.randomUUID(),
      file_name: file.name,
      file_type: file.type,
      file_size: buffer.length
    })},
    ${buffer}  -- <-- store binary directly
  )
`;

  return NextResponse.json({
    success: true,
    fileName,
    chunks: 1, // in real code, you’d split PDFs into multiple chunks
  });
};