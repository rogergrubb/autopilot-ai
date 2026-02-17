import { generateText, stepCountIs } from 'ai';
import { db } from '@/db';
import { autonomousTasks, taskSteps, notifications } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { primaryModel } from '@/lib/ai/config';
import type { ToolSet } from 'ai';

const DEFAULT_USER_ID = 'd30ca60b-0f38-498c-895d-30af8356af4a';

/**
 * Plan a task — use AI to decompose a goal into executable steps.
 */
export async function planTask(taskId: string): Promise<boolean> {
  if (!db) return false;

  const [task] = await db.select().from(autonomousTasks).where(eq(autonomousTasks.id, taskId)).limit(1);
  if (!task) return false;

  // Update status to planning
  await db.update(autonomousTasks)
    .set({ status: 'planning', startedAt: new Date(), updatedAt: new Date() })
    .where(eq(autonomousTasks.id, taskId));

  try {
    const { text } = await generateText({
      model: primaryModel,
      system: `You are a task planner. Given a goal, decompose it into 3-12 concrete, actionable steps.
Each step should be a single atomic action that can be executed independently.

Available tools the executor can use:
- webSearch: search the internet for information
- browseWebsite: navigate to and extract content from a URL
- generateImage: create images with DALL-E
- executeCode: run Python/JavaScript code in a sandbox
- searchKnowledge: search user's uploaded documents
- sendNotification: send alert to user's inbox
- makePhoneCall: call a phone number with AI voice
- deepResearch: multi-query research synthesis

Respond ONLY with a JSON array of steps. Each step must have:
- "title": short name (3-6 words)
- "instruction": detailed instruction for the AI executor (what to do, what to look for, what to produce)
- "toolName": (optional) which tool to use, or null if it's a reasoning/synthesis step

Example:
[
  {"title": "Research competitor pricing", "instruction": "Search the web for pricing pages of Acme Corp, Beta Inc, and Gamma LLC. Extract their pricing tiers, features, and price points.", "toolName": "webSearch"},
  {"title": "Compile pricing comparison", "instruction": "Using the research results, create a structured comparison table of all competitor pricing. Highlight where our pricing is better or worse.", "toolName": null},
  {"title": "Notify user with findings", "instruction": "Send a notification summarizing the key findings from the competitor pricing analysis.", "toolName": "sendNotification"}
]`,
      prompt: `Goal: ${task.goal}\n\nContext: ${JSON.stringify(task.context)}\n\nDecompose this into executable steps (JSON array):`,
    });

    // Parse steps from AI response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('AI did not return valid step array');

    const steps = JSON.parse(jsonMatch[0]) as Array<{ title: string; instruction: string; toolName?: string }>;

    if (!Array.isArray(steps) || steps.length === 0) {
      throw new Error('No steps generated');
    }

    // Cap steps at maxSteps
    const maxSteps = task.maxSteps || 20;
    const cappedSteps = steps.slice(0, maxSteps);

    // Insert step records
    const stepValues = cappedSteps.map((s, i) => ({
      id: nanoid(12),
      taskId,
      stepIndex: i,
      title: s.title,
      instruction: s.instruction,
      toolName: s.toolName || null,
      status: 'pending' as const,
    }));

    await db.insert(taskSteps).values(stepValues);

    // Update task with plan
    await db.update(autonomousTasks)
      .set({
        status: 'running',
        plan: cappedSteps,
        currentStepIndex: 0,
        updatedAt: new Date(),
      })
      .where(eq(autonomousTasks.id, taskId));

    return true;
  } catch (error) {
    console.error('[TaskRunner] Planning failed:', error);
    await db.update(autonomousTasks)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(eq(autonomousTasks.id, taskId));
    return false;
  }
}

/**
 * Execute the next pending step of a task.
 * Returns true if there are more steps to run, false if done/failed.
 */
export async function executeNextStep(taskId: string, tools: ToolSet): Promise<{ continue: boolean; stepCompleted?: string }> {
  if (!db) return { continue: false };

  // Load task
  const [task] = await db.select().from(autonomousTasks).where(eq(autonomousTasks.id, taskId)).limit(1);
  if (!task) return { continue: false };

  // Check if task should be running
  if (!['running', 'planning'].includes(task.status)) {
    return { continue: false };
  }

  // Find next pending step
  const [step] = await db.select()
    .from(taskSteps)
    .where(and(eq(taskSteps.taskId, taskId), eq(taskSteps.status, 'pending')))
    .orderBy(asc(taskSteps.stepIndex))
    .limit(1);

  if (!step) {
    // All steps done — mark task complete
    await db.update(autonomousTasks)
      .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
      .where(eq(autonomousTasks.id, taskId));

    // Send completion notification
    await db.insert(notifications).values({
      id: nanoid(12),
      userId: DEFAULT_USER_ID,
      title: `✅ Task Complete: ${task.title}`,
      body: `Your autonomous task "${task.title}" has finished all ${(task.plan as unknown[])?.length || 0} steps successfully.`,
      type: 'success',
      source: 'task-runner',
    });

    return { continue: false };
  }

  // Mark step as running
  await db.update(taskSteps)
    .set({ status: 'running', startedAt: new Date() })
    .where(eq(taskSteps.id, step.id));

  await db.update(autonomousTasks)
    .set({ currentStepIndex: step.stepIndex, updatedAt: new Date() })
    .where(eq(autonomousTasks.id, taskId));

  try {
    // Build context from prior step results
    const priorSteps = await db.select()
      .from(taskSteps)
      .where(and(eq(taskSteps.taskId, taskId), eq(taskSteps.status, 'completed')))
      .orderBy(asc(taskSteps.stepIndex));

    const priorContext = priorSteps.map(s =>
      `Step ${s.stepIndex + 1} "${s.title}": ${JSON.stringify(s.toolOutput || 'completed')}`
    ).join('\n');

    // Execute step using AI
    const result = await generateText({
      model: primaryModel,
      system: `You are an autonomous AI agent executing a task step-by-step.
You are currently on step ${step.stepIndex + 1} of task: "${task.goal}"

Previous step results:
${priorContext || '(no prior steps)'}

Execute the current step. Use tools if needed. Be thorough and produce concrete output.
After completing the step, summarize what you accomplished and any key data you found.`,
      prompt: `Step ${step.stepIndex + 1}: ${step.title}\nInstruction: ${step.instruction}`,
      tools,
      stopWhen: stepCountIs(5), // Allow tool use within a step
    });

    // Collect output
    const output = {
      text: result.text || '',
      toolCalls: result.response?.messages?.filter(
        (m: { role: string }) => m.role === 'assistant'
      ).length || 0,
    };

    // Mark step complete
    await db.update(taskSteps)
      .set({
        status: 'completed',
        toolOutput: output as unknown as Record<string, unknown>,
        completedAt: new Date(),
      })
      .where(eq(taskSteps.id, step.id));

    // Accumulate context on task
    const updatedContext = {
      ...(task.context as Record<string, unknown>),
      [`step_${step.stepIndex}`]: output.text?.slice(0, 2000) || 'done',
    };

    await db.update(autonomousTasks)
      .set({ context: updatedContext, updatedAt: new Date() })
      .where(eq(autonomousTasks.id, taskId));

    return { continue: true, stepCompleted: step.title };

  } catch (error) {
    console.error(`[TaskRunner] Step ${step.stepIndex} failed:`, error);

    const retries = (step.retryCount || 0) + 1;
    if (retries < 3) {
      // Retry
      await db.update(taskSteps)
        .set({ status: 'pending', retryCount: retries, error: String(error) })
        .where(eq(taskSteps.id, step.id));
      return { continue: true };
    }

    // Mark step and task as failed
    await db.update(taskSteps)
      .set({ status: 'failed', error: String(error), completedAt: new Date() })
      .where(eq(taskSteps.id, step.id));

    await db.update(autonomousTasks)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(eq(autonomousTasks.id, taskId));

    // Notify user of failure
    await db.insert(notifications).values({
      id: nanoid(12),
      userId: DEFAULT_USER_ID,
      title: `❌ Task Failed: ${task.title}`,
      body: `Step "${step.title}" failed after 3 retries: ${String(error).slice(0, 200)}`,
      type: 'warning',
      source: 'task-runner',
    });

    return { continue: false };
  }
}

/**
 * Get the base URL for self-chaining.
 */
export function getBaseUrl(): string {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return process.env.NEXTAUTH_URL || 'http://localhost:3000';
}

/**
 * Fire-and-forget: trigger the next step execution.
 * This creates the self-chaining pattern on Vercel serverless.
 */
export function chainNextStep(taskId: string): void {
  const url = `${getBaseUrl()}/api/tasks/${taskId}/run`;
  // Fire and forget — don't await
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-task-runner': 'internal' },
  }).catch(err => console.error('[TaskRunner] Chain failed:', err));
}
