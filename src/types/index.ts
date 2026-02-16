export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolName?: string;
  toolResult?: unknown;
  createdAt: Date;
}

export interface AgentConfig {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role: string;
  model: string;
  capabilities: string[];
  status: "idle" | "working" | "paused" | "waiting_input" | "completed" | "failed";
}

export interface ProjectConfig {
  id: string;
  title: string;
  description?: string;
  goal?: string;
  status: string;
  agent?: AgentConfig;
}

export interface TaskNode {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "waiting" | "completed" | "failed" | "cancelled";
  children: TaskNode[];
  toolsUsed: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  icon: string;
  category: "communication" | "research" | "creation" | "automation" | "integration";
  parameters: Record<string, unknown>;
}

export type AIProvider = "gemini" | "openai" | "anthropic";

export interface StreamMessage {
  type: "text" | "tool_call" | "tool_result" | "status" | "error";
  content: string;
  metadata?: Record<string, unknown>;
}
