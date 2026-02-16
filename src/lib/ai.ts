import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";

export function getModel(provider: string = "gemini", modelId?: string) {
  switch (provider) {
    case "gemini":
      return google(modelId || "gemini-2.5-pro-preview-05-06");
    case "openai":
      return openai(modelId || "gpt-4o");
    default:
      return google("gemini-2.5-pro-preview-05-06");
  }
}

export const DEFAULT_SYSTEM_PROMPT = `You are an autonomous AI agent powered by DoAnything. You can accomplish complex, multi-step tasks independently.

Your capabilities include:
- Breaking down complex goals into manageable tasks
- Using tools to interact with external services (email, web, code, etc.)
- Self-reflecting when stuck and finding alternative approaches
- Working persistently until the goal is achieved

When given a task:
1. Analyze the goal and break it into steps
2. Execute each step, using available tools
3. If stuck for 60 seconds, reflect and try a different approach
4. Report progress and ask for input only when truly necessary

Be proactive, resourceful, and persistent. Think step by step.`;
