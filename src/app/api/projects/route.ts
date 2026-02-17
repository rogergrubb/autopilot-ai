import { NextResponse } from 'next/server';
import { db } from '@/db';
import { projects } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

const DEFAULT_USER_ID = 'd30ca60b-0f38-498c-895d-30af8356af4a';

export async function GET() {
  if (!db) return NextResponse.json({ projects: [] });
  try {
    const result = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, DEFAULT_USER_ID))
      .orderBy(desc(projects.updatedAt))
      .limit(50);

    return NextResponse.json({ projects: result });
  } catch (error) {
    console.error('[Projects GET]', error);
    return NextResponse.json({ projects: [] });
  }
}

export async function POST(req: Request) {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    const { title, description, goal, status } = await req.json();

    const result = await db
      .insert(projects)
      .values({
        userId: DEFAULT_USER_ID,
        title: title || 'Untitled Project',
        description: description || null,
        goal: goal || null,
        status: status || 'active',
        metadata: {},
      })
      .returning();

    return NextResponse.json({ project: result[0] });
  } catch (error) {
    console.error('[Projects POST]', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
