CREATE TABLE "chats" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text DEFAULT 'New Chat',
	"messages" jsonb DEFAULT '[]'::jsonb,
	"agent_role" text DEFAULT 'social_strategist',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
