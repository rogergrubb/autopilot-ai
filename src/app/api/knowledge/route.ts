import { NextResponse } from 'next/server';
import { db } from '@/db';
import { knowledgeBases, knowledgeDocuments } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const DEFAULT_USER_ID = 'd30ca60b-0f38-498c-895d-30af8356af4a';

// GET /api/knowledge — list all knowledge bases with doc counts
export async function GET() {
  if (!db) return NextResponse.json({ knowledgeBases: [] });
  try {
    const rows = await db
      .select({
        id: knowledgeBases.id,
        name: knowledgeBases.name,
        description: knowledgeBases.description,
        createdAt: knowledgeBases.createdAt,
        updatedAt: knowledgeBases.updatedAt,
        docCount: sql<number>`(SELECT COUNT(*) FROM knowledge_documents WHERE kb_id = ${knowledgeBases.id})`.as('doc_count'),
      })
      .from(knowledgeBases)
      .where(eq(knowledgeBases.userId, DEFAULT_USER_ID))
      .orderBy(desc(knowledgeBases.updatedAt))
      .limit(50);

    return NextResponse.json({ knowledgeBases: rows });
  } catch (error) {
    console.error('[Knowledge GET]', error);
    return NextResponse.json({ knowledgeBases: [] });
  }
}

// POST /api/knowledge — create a new knowledge base
export async function POST(req: Request) {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    const { name, description } = await req.json();
    const id = nanoid(12);

    const result = await db
      .insert(knowledgeBases)
      .values({
        id,
        name: name || 'Untitled Knowledge Base',
        description: description || null,
        userId: DEFAULT_USER_ID,
      })
      .returning();

    return NextResponse.json({ knowledgeBase: result[0] });
  } catch (error) {
    console.error('[Knowledge POST]', error);
    return NextResponse.json({ error: 'Failed to create knowledge base' }, { status: 500 });
  }
}
