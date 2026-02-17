import { NextResponse } from 'next/server';
import { db } from '@/db';
import { autonomousTasks } from '@/db/schema';
import { eq, and, lt, or } from 'drizzle-orm';
import { chainNextStep } from '@/lib/tasks/runner';

// GET /api/cron/tasks — Vercel cron picks up stalled tasks
// This is a safety net: if a self-chain breaks, the cron restarts it
export async function GET() {
  if (!db) return NextResponse.json({ ok: false, reason: 'no db' });

  try {
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);

    // Find tasks that should be running but seem stalled
    const stalledTasks = await db.select()
      .from(autonomousTasks)
      .where(
        and(
          eq(autonomousTasks.status, 'running'),
          lt(autonomousTasks.updatedAt, twoMinAgo)
        )
      )
      .limit(5);

    // Find tasks waiting with a resume_after in the past
    const waitingTasks = await db.select()
      .from(autonomousTasks)
      .where(
        and(
          or(eq(autonomousTasks.status, 'waiting'), eq(autonomousTasks.status, 'pending')),
          lt(autonomousTasks.updatedAt, twoMinAgo)
        )
      )
      .limit(5);

    let restarted = 0;

    for (const task of [...stalledTasks, ...waitingTasks]) {
      console.log(`[Cron] Restarting stalled task: ${task.id} (${task.title})`);

      if (task.status === 'pending') {
        // Re-trigger planning
        const { planTask } = await import('@/lib/tasks/runner');
        planTask(task.id).then(planned => {
          if (planned) chainNextStep(task.id);
        });
      } else {
        // Resume execution
        await db.update(autonomousTasks)
          .set({ status: 'running', updatedAt: new Date() })
          .where(eq(autonomousTasks.id, task.id));
        chainNextStep(task.id);
      }
      restarted++;
    }

    return NextResponse.json({
      ok: true,
      stalled: stalledTasks.length,
      waiting: waitingTasks.length,
      restarted,
    });
  } catch (error) {
    console.error('[Cron Tasks]', error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
