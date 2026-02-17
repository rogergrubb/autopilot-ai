import { NextResponse } from 'next/server';
import { db } from '@/db';
import { knowledgeBases, knowledgeDocuments } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    const kb = await db.select().from(knowledgeBases).where(eq(knowledgeBases.id, id)).limit(1);
    if (!kb.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const docs = await db
      .select({
        id: knowledgeDocuments.id,
        name: knowledgeDocuments.name,
        type: knowledgeDocuments.type,
        mimeType: knowledgeDocuments.mimeType,
        sizeBytes: knowledgeDocuments.sizeBytes,
        url: knowledgeDocuments.url,
        createdAt: knowledgeDocuments.createdAt,
      })
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.kbId, id));

    return NextResponse.json({ knowledgeBase: kb[0], documents: docs });
  } catch (error) {
    console.error('[Knowledge GET id]', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    // Cascade deletes documents automatically
    await db.delete(knowledgeBases).where(eq(knowledgeBases.id, id));
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('[Knowledge DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
