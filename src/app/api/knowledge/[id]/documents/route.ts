import { NextResponse } from 'next/server';
import { db } from '@/db';
import { knowledgeDocuments, knowledgeBases } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// GET /api/knowledge/[id]/documents — list docs in a KB
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!db) return NextResponse.json({ documents: [] });
  try {
    const docs = await db
      .select()
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.kbId, id));

    return NextResponse.json({ documents: docs });
  } catch (error) {
    console.error('[KBDocs GET]', error);
    return NextResponse.json({ documents: [] });
  }
}

// POST /api/knowledge/[id]/documents — add a document (file, URL, or text)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: kbId } = await params;
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

  try {
    const contentType = req.headers.get('content-type') || '';

    // Handle multipart file upload
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

      // Read file content
      const buffer = await file.arrayBuffer();
      const text = await extractText(file.name, file.type, buffer);

      const docId = nanoid(12);
      const result = await db
        .insert(knowledgeDocuments)
        .values({
          id: docId,
          kbId,
          name: file.name,
          type: 'file',
          mimeType: file.type,
          content: text,
          sizeBytes: file.size,
          metadata: { originalName: file.name },
        })
        .returning();

      // Update KB timestamp
      await db.update(knowledgeBases).set({ updatedAt: new Date() }).where(eq(knowledgeBases.id, kbId));

      return NextResponse.json({ document: result[0] });
    }

    // Handle JSON body (URL or text)
    const body = await req.json();

    if (body.type === 'url') {
      // Fetch URL content
      let content = '';
      try {
        const res = await fetch(body.url, {
          headers: { 'User-Agent': 'AutoPilot-KB/1.0' },
          signal: AbortSignal.timeout(10000),
        });
        const html = await res.text();
        // Simple HTML → text extraction
        content = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 100000); // 100KB text limit
      } catch (e) {
        content = `[Failed to fetch URL: ${body.url}]`;
      }

      const docId = nanoid(12);
      const result = await db
        .insert(knowledgeDocuments)
        .values({
          id: docId,
          kbId,
          name: body.name || new URL(body.url).hostname,
          type: 'url',
          mimeType: 'text/html',
          content,
          url: body.url,
          sizeBytes: content.length,
          metadata: { url: body.url },
        })
        .returning();

      await db.update(knowledgeBases).set({ updatedAt: new Date() }).where(eq(knowledgeBases.id, kbId));
      return NextResponse.json({ document: result[0] });
    }

    if (body.type === 'text') {
      const docId = nanoid(12);
      const content = (body.content || '').slice(0, 100000);
      const result = await db
        .insert(knowledgeDocuments)
        .values({
          id: docId,
          kbId,
          name: body.name || 'Text Note',
          type: 'text',
          mimeType: 'text/plain',
          content,
          sizeBytes: content.length,
          metadata: {},
        })
        .returning();

      await db.update(knowledgeBases).set({ updatedAt: new Date() }).where(eq(knowledgeBases.id, kbId));
      return NextResponse.json({ document: result[0] });
    }

    return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
  } catch (error) {
    console.error('[KBDocs POST]', error);
    return NextResponse.json({ error: 'Failed to add document' }, { status: 500 });
  }
}

/**
 * Extract text from uploaded files.
 * Supports: .txt, .md, .csv, .json, .html, .pdf (basic)
 */
async function extractText(filename: string, mimeType: string, buffer: ArrayBuffer): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase();
  const decoder = new TextDecoder('utf-8', { fatal: false });

  // Plain text formats
  if (['txt', 'md', 'csv', 'tsv', 'json', 'xml', 'html', 'htm', 'css', 'js', 'ts', 'py', 'yaml', 'yml', 'toml', 'ini', 'env', 'log'].includes(ext || '')) {
    return decoder.decode(buffer).slice(0, 100000);
  }

  // HTML — strip tags
  if (mimeType.includes('html')) {
    const html = decoder.decode(buffer);
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 100000);
  }

  // PDF — extract text (basic: looks for text between stream markers)
  if (ext === 'pdf' || mimeType === 'application/pdf') {
    const raw = decoder.decode(buffer);
    // Extract text from PDF text objects (basic extraction)
    const textParts: string[] = [];
    const tjRegex = /\(([^)]+)\)\s*Tj/g;
    let match;
    while ((match = tjRegex.exec(raw)) !== null) {
      textParts.push(match[1]);
    }
    if (textParts.length > 0) {
      return textParts.join(' ').slice(0, 100000);
    }
    // Fallback: try to find readable text sequences
    const readable = raw.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
    return readable.slice(0, 50000) || '[PDF content could not be extracted — try uploading as .txt]';
  }

  // Unknown format — try as text
  try {
    return decoder.decode(buffer).slice(0, 100000);
  } catch {
    return '[Binary file — content not extractable]';
  }
}
