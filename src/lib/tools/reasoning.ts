import { tool } from 'ai';
import { z } from 'zod';

/**
 * Self-reflection tool — forces the agent to evaluate its progress
 * before continuing with more work. This prevents blind auto-continue
 * and ensures the agent reasons about what it's done and what to do next.
 */
export const selfReflect = tool({
  description: 'Reflect on your current progress before continuing. Use this when working on complex tasks to evaluate what you\'ve accomplished, identify gaps, and decide next steps. Call this BEFORE continuing any multi-step task.',
  inputSchema: z.object({
    taskGoal: z.string().describe('What was the original goal or request?'),
    completedSteps: z.array(z.string()).describe('What have you already accomplished? List concrete outputs.'),
    qualityAssessment: z.enum(['excellent', 'good', 'needs_improvement', 'poor']).describe('How well does the work so far meet the goal?'),
    gaps: z.array(z.string()).describe('What is missing or could be improved?'),
    shouldContinue: z.boolean().describe('Should you keep working on this, or is it complete enough?'),
    nextAction: z.string().describe('If continuing, what specifically should you do next?'),
    confidence: z.number().min(0).max(100).describe('Your confidence level (0-100) that the current output meets the user\'s needs'),
  }),
  execute: async ({ taskGoal, completedSteps, qualityAssessment, gaps, shouldContinue, nextAction, confidence }) => {
    return {
      reflection: {
        goal: taskGoal,
        stepsCompleted: completedSteps.length,
        completedSteps,
        quality: qualityAssessment,
        gaps,
        recommendation: shouldContinue ? 'continue' : 'complete',
        nextAction: shouldContinue ? nextAction : 'Deliver final output to user',
        confidence,
        timestamp: new Date().toISOString(),
      },
      instruction: shouldContinue
        ? `Quality: ${qualityAssessment} (${confidence}% confidence). Continue with: ${nextAction}`
        : `Quality: ${qualityAssessment} (${confidence}% confidence). Work is complete — deliver the final output.`,
    };
  },
});

/**
 * Plan next steps — decompose a complex goal into an ordered task list.
 * Used at the start of complex requests to create a structured plan.
 */
export const planNextSteps = tool({
  description: 'Create a structured plan for a complex task. Use this at the START of any multi-step request to decompose the goal into concrete, ordered steps before executing.',
  inputSchema: z.object({
    goal: z.string().describe('The overall goal to accomplish'),
    steps: z.array(z.object({
      order: z.number().describe('Step number (1-based)'),
      action: z.string().describe('What to do in this step'),
      tool: z.string().optional().describe('Which tool to use, if any'),
      estimatedTime: z.string().optional().describe('How long this step might take'),
    })).describe('Ordered list of steps to accomplish the goal'),
    totalSteps: z.number().describe('Total number of steps in the plan'),
    complexity: z.enum(['simple', 'moderate', 'complex']).describe('Overall complexity assessment'),
    risks: z.array(z.string()).optional().describe('Potential risks or blockers'),
  }),
  execute: async ({ goal, steps, totalSteps, complexity, risks }) => {
    return {
      plan: {
        goal,
        steps,
        totalSteps,
        complexity,
        risks: risks || [],
        createdAt: new Date().toISOString(),
      },
      instruction: `Plan created with ${totalSteps} steps (${complexity} complexity). Begin with step 1: ${steps[0]?.action || 'Start working'}`,
    };
  },
});
