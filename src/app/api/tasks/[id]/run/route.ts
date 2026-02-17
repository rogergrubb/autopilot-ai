import { NextResponse, NextRequest } from 'next/server';
import { executeNextStep, chainNextStep } from '@/lib/tasks/runner';
import { searchKnowledge } from '@/lib/tools/knowledge-search';
import { sendNotification } from '@/lib/tools/notifications';
import { makePhoneCall } from '@/lib/tools/phone-call';
import type { ToolSet } from 'ai';

// Allow long execution for task steps
export const maxDuration = 300;

// Tools available to the task runner
function getTaskTools(): ToolSet {
  return {
    searchKnowledge,
    sendNotification,
    makePhoneCall,
  } as unknown as ToolSet;
}

// POST /api/tasks/[id]/run — execute the next step of a task
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: taskId } = await params;

  try {
    const tools = getTaskTools();
    const result = await executeNextStep(taskId, tools);

    if (result.continue) {
      // Self-chain: fire the next step after a small delay
      // This creates the autonomous execution loop
      setTimeout(() => chainNextStep(taskId), 500);
    }

    return NextResponse.json({
      taskId,
      continue: result.continue,
      stepCompleted: result.stepCompleted || null,
    });
  } catch (error) {
    console.error(`[TaskRun ${taskId}]`, error);
    return NextResponse.json({ error: 'Step execution failed' }, { status: 500 });
  }
}
