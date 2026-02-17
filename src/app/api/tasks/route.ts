import { NextResponse } from 'next/server';
import { db } from '@/db';
import { autonomousTasks, taskSteps } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { planTask, chainNextStep } from '@/lib/tasks/runner';

const DEFAULT_USER_ID = 'd30ca60b-0f38-498c-895d-30af8356af4a';

// GET /api/tasks — list all autonomous tasks
export async function GET() {
  if (!db) return NextResponse.json({ tasks: [] });
  try {
    const tasks = await db.select().from(autonomousTasks)
      .where(eq(autonomousTasks.userId, DEFAULT_USER_ID))
      .orderBy(desc(autonomousTasks.createdAt))
      .limit(50);

    // Get step counts per task
    const enriched = await Promise.all(tasks.map(async (task) => {
      const steps = await db!.select({
        total: sql<number>`count(*)`,
        completed: sql<number>`count(*) filter (where ${taskSteps.status} = 'completed')`,
        failed: sql<number>`count(*) filter (where ${taskSteps.status} = 'failed')`,
      }).from(taskSteps).where(eq(taskSteps.taskId, task.id));

      return {
        ...task,
        steps: {
          total: Number(steps[0]?.total || 0),
          completed: Number(steps[0]?.completed || 0),
          failed: Number(steps[0]?.failed || 0),
        },
      };
    }));

    return NextResponse.json({ tasks: enriched });
  } catch (error) {
    console.error('[Tasks GET]', error);
    return NextResponse.json({ tasks: [] });
  }
}

// POST /api/tasks — create a new autonomous task and start it
export async function POST(req: Request) {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

  try {
    const { title, goal, chatId, projectId, maxSteps } = await req.json();

    if (!goal) {
      return NextResponse.json({ error: 'Goal is required' }, { status: 400 });
    }

    const taskId = nanoid(12);
    const taskTitle = title || goal.slice(0, 80);

    await db.insert(autonomousTasks).values({
      id: taskId,
      userId: DEFAULT_USER_ID,
      title: taskTitle,
      goal,
      status: 'pending',
      chatId: chatId || null,
      projectId: projectId || null,
      maxSteps: maxSteps || 20,
    });

    // Start planning in the background — plan then chain to execution
    (async () => {
      const planned = await planTask(taskId);
      if (planned) {
        chainNextStep(taskId);
      }
    })();

    return NextResponse.json({
      taskId,
      title: taskTitle,
      status: 'pending',
      message: `Task "${taskTitle}" created and starting. The agent will work on this autonomously.`,
    });
  } catch (error) {
    console.error('[Tasks POST]', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
