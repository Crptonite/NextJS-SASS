import { neon } from '@neondatabase/serverless';
import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import mammoth from 'mammoth';

const sql = neon(process.env.DATABASE_URL!);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

function safeDecodeURIComponent(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    try {
      return decodeURIComponent(str.replace(/%/g, "%25"));
    } catch {
      return str;
    }
  }
}

async function extractTextFromFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".pdf")) {
    const PDFParser = (await import("pdf2json")).default;

    return new Promise((resolve, reject) => {
      const pdfParser = new (PDFParser as any)(null, true);

      pdfParser.on("pdfParser_dataError", (err: any) =>
        reject(new Error(`PDF parsing error: ${err.parserError}`))
      );

      pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
        try {
          let fullText = "";

          pdfData.Pages?.forEach((page: any) =>
            page.Texts?.forEach((text: any) =>
              text.R?.forEach((r: any) => {
                if (r.T) {
                  fullText += safeDecodeURIComponent(r.T) + " ";
                }
              })
            )
          );

          resolve(fullText.trim());
        } catch (error: any) {
          reject(new Error(`Error extracting text: ${error.message}`));
        }
      });

      pdfParser.parseBuffer(buffer);
    });
  }

  if (fileName.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (fileName.endsWith(".txt")) {
    return buffer.toString("utf-8");
  }

  throw new Error("Unsupported file type. Upload PDF, DOCX, or TXT.");
}

export async function POST(req: Request) {
  try {
    const file = (await req.formData()).get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const documentId = crypto.randomUUID();
    const uploadDate = new Date().toISOString();

    // Extract text
    const text = await extractTextFromFile(file);

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Could not extract text from file" },
        { status: 400 }
      );
    }

    // Split text into chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 800,
      chunkOverlap: 100,
    });

    const chunks = await textSplitter.splitText(text);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Generate embedding
      const emb = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
      });

      const embedding = emb.data[0].embedding;

      await sql`
        INSERT INTO documents (
          content,
          metadata,
          embedding
        )
        VALUES (
          ${chunk},
          ${JSON.stringify({
            document_id: documentId,
            file_name: file.name,
            file_type: file.type || file.name.split(".").pop(),
            file_size: file.size,
            upload_date: uploadDate,
            chunk_index: i,
            total_chunks: chunks.length
          })}::jsonb,
          ${JSON.stringify(embedding)}::vector
        )
      `;
    }

    return NextResponse.json({
      success: true,
      documentId,
      fileName: file.name,
      chunks: chunks.length,
      textLength: text.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Upload failed",
      },
      { status: 500 }
    );
  }
}