import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { autonomousTasks, taskSteps } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { chainNextStep } from '@/lib/tasks/runner';

// GET /api/tasks/[id] — get task detail with all steps
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  const { id } = await params;

  try {
    const [task] = await db.select().from(autonomousTasks)
      .where(eq(autonomousTasks.id, id))
      .limit(1);

    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const steps = await db.select().from(taskSteps)
      .where(eq(taskSteps.taskId, id))
      .orderBy(asc(taskSteps.stepIndex));

    return NextResponse.json({ task, steps });
  } catch (error) {
    console.error('[Task GET]', error);
    return NextResponse.json({ error: 'Failed to load task' }, { status: 500 });
  }
}

// PATCH /api/tasks/[id] — pause, resume, or cancel a task
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  const { id } = await params;

  try {
    const { action, pauseReason } = await req.json();

    const [task] = await db.select().from(autonomousTasks)
      .where(eq(autonomousTasks.id, id))
      .limit(1);

    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    switch (action) {
      case 'pause':
        if (!['running', 'planning'].includes(task.status)) {
          return NextResponse.json({ error: `Cannot pause task in "${task.status}" status` }, { status: 400 });
        }
        await db.update(autonomousTasks)
          .set({ status: 'paused', pauseReason: pauseReason || 'User paused', updatedAt: new Date() })
          .where(eq(autonomousTasks.id, id));
        return NextResponse.json({ status: 'paused', message: 'Task paused' });

      case 'resume':
        if (task.status !== 'paused') {
          return NextResponse.json({ error: `Cannot resume task in "${task.status}" status` }, { status: 400 });
        }
        await db.update(autonomousTasks)
          .set({ status: 'running', pauseReason: null, updatedAt: new Date() })
          .where(eq(autonomousTasks.id, id));
        // Chain to continue execution
        chainNextStep(id);
        return NextResponse.json({ status: 'running', message: 'Task resumed' });

      case 'cancel':
        if (['completed', 'cancelled'].includes(task.status)) {
          return NextResponse.json({ error: `Cannot cancel task in "${task.status}" status` }, { status: 400 });
        }
        await db.update(autonomousTasks)
          .set({ status: 'cancelled', completedAt: new Date(), updatedAt: new Date() })
          .where(eq(autonomousTasks.id, id));
        return NextResponse.json({ status: 'cancelled', message: 'Task cancelled' });

      default:
        return NextResponse.json({ error: 'Invalid action. Use: pause, resume, cancel' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Task PATCH]', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// DELETE /api/tasks/[id] — delete a task and its steps
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  const { id } = await params;

  try {
    await db.delete(autonomousTasks).where(eq(autonomousTasks.id, id));
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('[Task DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
