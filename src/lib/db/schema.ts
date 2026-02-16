import { pgTable, text, timestamp, jsonb, boolean, integer, uuid, pgEnum } from 'drizzle-orm/pg-core';

// Enums
export const agentStatusEnum = pgEnum('agent_status', ['idle', 'working', 'waiting', 'paused', 'completed', 'error']);
export const taskStatusEnum = pgEnum('task_status', ['pending', 'in_progress', 'blocked', 'completed', 'failed']);
export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant', 'system', 'tool']);
export const platformEnum = pgEnum('platform', ['twitter', 'instagram', 'tiktok', 'linkedin', 'reddit', 'youtube', 'facebook', 'threads']);

// Users
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Agents - autonomous workers with their own identity
export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  email: text('email'),
  avatar: text('avatar'),
  role: text('role').notNull().default('general'), // social_strategist, content_creator, researcher, etc.
  personality: text('personality'), // Agent's personality/style description
  status: agentStatusEnum('status').default('idle').notNull(),
  model: text('model').default('gemini-2.5-pro').notNull(),
  memory: jsonb('memory').$type<Record<string, unknown>>().default({}),
  tools: jsonb('tools').$type<string[]>().default([]),
  config: jsonb('config').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Projects - high-level goals
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  agentId: uuid('agent_id').references(() => agents.id),
  title: text('title').notNull(),
  description: text('description'),
  goal: text('goal'), // The high-level objective
  status: taskStatusEnum('status').default('pending').notNull(),
  progress: integer('progress').default(0), // 0-100
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tasks - decomposed work items within a project
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  agentId: uuid('agent_id').references(() => agents.id),
  parentTaskId: uuid('parent_task_id'),
  title: text('title').notNull(),
  description: text('description'),
  status: taskStatusEnum('status').default('pending').notNull(),
  priority: integer('priority').default(0),
  result: text('result'),
  error: text('error'),
  attempts: integer('attempts').default(0),
  maxAttempts: integer('max_attempts').default(3),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Messages - conversation history between user and agent
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  agentId: uuid('agent_id').references(() => agents.id),
  role: messageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  toolName: text('tool_name'),
  toolResult: jsonb('tool_result').$type<Record<string, unknown>>(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Tool executions - log of all tool calls
export const toolExecutions = pgTable('tool_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').references(() => tasks.id),
  agentId: uuid('agent_id').references(() => agents.id).notNull(),
  toolName: text('tool_name').notNull(),
  input: jsonb('input').$type<Record<string, unknown>>().default({}),
  output: jsonb('output').$type<Record<string, unknown>>(),
  status: text('status').default('pending'), // pending, success, error
  duration: integer('duration'), // ms
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Social campaigns - tracks social media strategy
export const socialCampaigns = pgTable('social_campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  agentId: uuid('agent_id').references(() => agents.id),
  name: text('name').notNull(),
  platforms: jsonb('platforms').$type<string[]>().default([]),
  targetAudience: text('target_audience'),
  brandVoice: text('brand_voice'),
  goals: jsonb('goals').$type<Record<string, unknown>>().default({}),
  schedule: jsonb('schedule').$type<Record<string, unknown>>().default({}),
  metrics: jsonb('metrics').$type<Record<string, unknown>>().default({}),
  status: text('status').default('draft'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Social posts - individual content pieces
export const socialPosts = pgTable('social_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => socialCampaigns.id),
  agentId: uuid('agent_id').references(() => agents.id),
  platform: platformEnum('platform').notNull(),
  content: text('content').notNull(),
  mediaUrls: jsonb('media_urls').$type<string[]>().default([]),
  hashtags: jsonb('hashtags').$type<string[]>().default([]),
  scheduledFor: timestamp('scheduled_for'),
  publishedAt: timestamp('published_at'),
  status: text('status').default('draft'), // draft, scheduled, published, failed
  engagement: jsonb('engagement').$type<{
    likes?: number;
    comments?: number;
    shares?: number;
    clicks?: number;
    impressions?: number;
  }>().default({}),
  platformPostId: text('platform_post_id'), // ID from the social platform
  promotesProduct: text('promotes_product'), // papervault, sellfast, braincandy
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Agent memory - persistent knowledge across sessions
export const agentMemory = pgTable('agent_memory', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').references(() => agents.id).notNull(),
  key: text('key').notNull(),
  value: jsonb('value').$type<unknown>(),
  category: text('category').default('general'), // strategy, audience, content, performance
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Products being promoted
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(), // papervault, sellfast, braincandy
  url: text('url').notNull(),
  description: text('description'),
  tagline: text('tagline'),
  targetAudience: text('target_audience'),
  uniqueValue: text('unique_value'), // USP
  contentThemes: jsonb('content_themes').$type<string[]>().default([]),
  brandVoice: text('brand_voice'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
