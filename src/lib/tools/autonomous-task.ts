import { tool } from 'ai';
import { z } from 'zod';

/**
 * Launch an autonomous background task.
 * The agent will plan steps, execute them one-by-one, and notify the user when done.
 */
export const createAutonomousTask = tool({
  description: `Launch an autonomous background task that will execute even after the user closes this chat. Use this for complex, multi-step goals that require research, multiple tool calls, or extended work. The task will: (1) decompose the goal into steps using AI, (2) execute each step autonomously with available tools, (3) retry failed steps up to 3 times, (4) notify the user when complete or if it fails. Good examples: "Research 5 competitors and compile a report", "Find and summarize the top 10 AI papers from this week", "Create a social media content calendar for next month". The user can pause, resume, or cancel tasks from the Tasks tab.`,
  inputSchema: z.object({
    title: z.string().describe('Short title for the task (3-8 words)'),
    goal: z.string().describe('Detailed goal description. Be specific about what you want accomplished, what output to produce, and any constraints.'),
    maxSteps: z.number().optional().describe('Maximum number of steps (default 12, max 20)'),
  }),
  execute: async ({ title, goal, maxSteps }) => {
    try {
      const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.NEXTAUTH_URL || 'http://localhost:3000';

      const res = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, goal, maxSteps: Math.min(maxSteps || 12, 20) }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { launched: false, error: data.error || 'Failed to create task' };
      }

      return {
        launched: true,
        taskId: data.taskId,
        title: data.title,
        message: `🚀 Autonomous task "${data.title}" launched. The agent is now planning and executing steps in the background. You'll get a notification when it's done. You can check progress in the Tasks tab.`,
      };
    } catch (error) {
      return { launched: false, error: error instanceof Error ? error.message : 'Failed to launch task' };
    }
  },
});

/**
 * Check on the status of an autonomous task.
 */
export const checkTaskStatus = tool({
  description: 'Check the current status and progress of an autonomous background task. Use this when the user asks about a task they launched earlier.',
  inputSchema: z.object({
    taskId: z.string().describe('The task ID to check'),
  }),
  execute: async ({ taskId }) => {
    try {
      const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.NEXTAUTH_URL || 'http://localhost:3000';

      const res = await fetch(`${baseUrl}/api/tasks/${taskId}`);
      const data = await res.json();

      if (!res.ok) {
        return { found: false, error: data.error || 'Task not found' };
      }

      const task = data.task;
      const steps = data.steps || [];
      const completed = steps.filter((s: { status: string }) => s.status === 'completed').length;
      const failed = steps.filter((s: { status: string }) => s.status === 'failed').length;
      const total = steps.length;

      return {
        found: true,
        taskId: task.id,
        title: task.title,
        status: task.status,
        progress: `${completed}/${total} steps completed${failed > 0 ? `, ${failed} failed` : ''}`,
        currentStep: task.currentStepIndex,
        steps: steps.map((s: { title: string; status: string; stepIndex: number }) => ({
          step: s.stepIndex + 1,
          title: s.title,
          status: s.status,
        })),
      };
    } catch (error) {
      return { found: false, error: error instanceof Error ? error.message : 'Failed to check task' };
    }
  },
});
