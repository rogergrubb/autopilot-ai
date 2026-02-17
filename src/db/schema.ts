import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";

// === Enums ===
export const agentStatusEnum = pgEnum("agent_status", [
  "idle",
  "working",
  "paused",
  "waiting_input",
  "completed",
  "failed",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "pending",
  "in_progress",
  "waiting",
  "completed",
  "failed",
  "cancelled",
]);

export const messageRoleEnum = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
  "tool",
]);

// === Users ===
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  settings: jsonb("settings").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// === Agents ===
export const agents = pgTable("agents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  name: text("name").notNull(),
  email: text("email"),
  avatar: text("avatar"),
  role: text("role").default("General Assistant"),
  systemPrompt: text("system_prompt"),
  status: agentStatusEnum("status").default("idle").notNull(),
  model: text("model").default("gemini-2.5-pro"),
  capabilities: jsonb("capabilities").$type<string[]>().default([]),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// === Projects ===
export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  agentId: uuid("agent_id").references(() => agents.id),
  title: text("title").notNull(),
  description: text("description"),
  goal: text("goal"),
  status: text("status").default("active"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// === Tasks (hierarchical) ===
export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  agentId: uuid("agent_id").references(() => agents.id),
  parentTaskId: uuid("parent_task_id"),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").default("pending").notNull(),
  priority: integer("priority").default(0),
  result: text("result"),
  error: text("error"),
  toolsUsed: jsonb("tools_used").$type<string[]>().default([]),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// === Messages (chat history) ===
export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => projects.id)
    .notNull(),
  agentId: uuid("agent_id").references(() => agents.id),
  taskId: uuid("task_id").references(() => tasks.id),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  toolName: text("tool_name"),
  toolResult: jsonb("tool_result"),
  model: text("model"),
  tokens: integer("tokens"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === Tool Results ===
export const toolResults = pgTable("tool_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").references(() => tasks.id),
  agentId: uuid("agent_id")
    .references(() => agents.id)
    .notNull(),
  toolName: text("tool_name").notNull(),
  input: jsonb("input"),
  output: jsonb("output"),
  success: boolean("success").default(true),
  error: text("error"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === Agent Memory (long-term knowledge per agent) ===
export const agentMemory = pgTable("agent_memory", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id")
    .references(() => agents.id)
    .notNull(),
  key: text("key").notNull(),
  value: text("value").notNull(),
  category: text("category").default("general"),
  importance: integer("importance").default(5),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// === App Connections (Pipedream OAuth connections per user) ===
export const appConnections = pgTable("app_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  appName: text("app_name").notNull(),
  accountId: text("account_id"),
  status: text("status").default("connected"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === Chats (conversation persistence) ===
export const chats = pgTable("chats", {
  id: text("id").primaryKey(), // nanoid-generated
  title: text("title").default("New Chat"),
  messages: jsonb("messages").$type<unknown[]>().default([]),
  agentRole: text("agent_role").default("social_strategist"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// === Knowledge Bases ===
export const knowledgeBases = pgTable("knowledge_bases", {
  id: text("id").primaryKey(), // nanoid-generated
  name: text("name").notNull(),
  description: text("description"),
  userId: uuid("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// === Knowledge Documents (files, URLs, text within a KB) ===
export const knowledgeDocuments = pgTable("knowledge_documents", {
  id: text("id").primaryKey(), // nanoid-generated
  kbId: text("kb_id").references(() => knowledgeBases.id, { onDelete: 'cascade' }).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'file', 'url', 'text'
  mimeType: text("mime_type"),
  content: text("content"), // extracted text content
  url: text("url"), // for URL-type docs
  sizeBytes: integer("size_bytes"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === Notifications (agent inbox) ===
export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  title: text("title").notNull(),
  body: text("body"),
  type: text("type").notNull().default("info"), // 'info', 'success', 'warning', 'task', 'reminder'
  source: text("source"), // which tool/agent generated it
  chatId: text("chat_id"), // optional link to a chat
  read: boolean("read").default(false).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === User Memories (imported from ChatGPT or manually added) ===
export const userMemories = pgTable("user_memories", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  content: text("content").notNull(),
  category: text("category").default("general"),
  source: text("source").default("manual"), // 'chatgpt', 'manual', 'agent'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === Type exports ===
export type Chat = typeof chats.$inferSelect;
export type KnowledgeBase = typeof knowledgeBases.$inferSelect;
export type KnowledgeDocument = typeof knowledgeDocuments.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type UserMemory = typeof userMemories.$inferSelect;
export type User = typeof users.$inferSelect;
export type Agent = typeof agents.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type ToolResult = typeof toolResults.$inferSelect;
export type AgentMemory = typeof agentMemory.$inferSelect;
export type AppConnection = typeof appConnections.$inferSelect;
