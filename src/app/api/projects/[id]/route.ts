import { NextResponse } from 'next/server';
import { db } from '@/db';
import { projects } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    if (!result.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ project: result[0] });
  } catch (error) {
    console.error('[Project GET]', error);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    const body = await req.json();
    const result = await db
      .update(projects)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning();

    if (!result.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ project: result[0] });
  } catch (error) {
    console.error('[Project PUT]', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    await db.delete(projects).where(eq(projects.id, id));
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('[Project DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
