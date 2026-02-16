# Agent Memory – DoAnything Clone

## 1. Project Overview
- Full-stack clone of doanything.com — autonomous AI agent platform
- Primary user: Roger Grubb (NumberOneSonSoftware)
- Stack: Next.js 16.1.6, React 19, AI SDK v6 (ai@6.0.86), Gemini 2.5 Pro, Drizzle ORM, Zustand
- Repo: github.com/rogergrubb/doanything-clone
- Live: doanything-clone.vercel.app
- Non-goals: Exact pixel replica; focus on functional parity of agent capabilities

## 2. Definition of Done (DoD)
- 10 core tools: Email, Phone, Browser, Research, Code (Claude Code), Files, Websites, Images, Subagents, Slides
- 3000+ app connections via Pipedream MCP
- Self-reflection loop (not just auto-continue)
- Works for days/months (durable execution)
- Agent has own identity (name + email)
- SMS notifications to user
- UI matches original warm cream/green aesthetic
- Sidebar: Knowledge Bases, Skills, Agent Inbox, model selector, settings, credits

## 3. Current State
- Build: ✅ Passing on Vercel (commit bcc3c55)
- Deploy: ✅ Production READY
- Git webhook: ✅ Working (was disconnected, now fixed)
- MCP: ✅ Wired (Pipedream SDK + @modelcontextprotocol/sdk installed, env vars set)
- DB: ❌ No DATABASE_URL, schema not migrated
- Auth: ⚠️ Demo credentials only

## 4. Architecture & Design Decisions
- AI SDK v6 with `useChat({ transport })` + `DefaultChatTransport` pattern
- Pipedream remote MCP at `https://remote.mcp.pipedream.net` (not self-hosted)
- MCPSessionManager creates per-request MCP connections, converts tools to AI SDK ToolSet
- Local tools (social media) always available; MCP tools merge in when Pipedream configured
- `stopWhen: stepCountIs(8)` for multi-step agent loops
- Client-side auto-continue at 55s (Vercel hobby 60s cap workaround)
- Zod v4 used (not v3) — avoid `.describe()` on enum values

## 5. Known Issues & Landmines
- Vercel hobby tier caps functions at 60s; auto-continue is workaround, not fix
- pnpm lockfile must stay in sync — project uses pnpm, npm installs break Vercel build
- AI SDK v6 `tool()` with `jsonSchema()` has strict typing; use raw objects for MCP tools
- `inputSchema` not `parameters` for tool definitions in AI SDK v6 with zod
- `@pipedream/sdk` PipedreamClient requires env vars (PIPEDREAM_CLIENT_ID, CLIENT_SECRET, PROJECT_ID), won't init without them

## 6. Debug History
- pnpm lockfile out of sync → Vercel build error `ERR_PNPM_OUTDATED_LOCKFILE` → Fix: `npx pnpm install` to regenerate lockfile
- Git webhook disconnected → Vercel not auto-deploying → Fix: User reconnected in Vercel Settings → Git
- tool() + jsonSchema() type error in v6 → Fix: Use raw `{ description, parameters, execute }` objects cast as ToolSet

## 7. Proven Patterns
- Always use `npx pnpm install` (not npm) for adding dependencies
- Push to GitHub triggers Vercel auto-deploy (webhook working as of bcc3c55)
- GitHub PAT for push: stored in Claude session (not committed)
- Verify with `npx tsc --noEmit` then `npx next build` before pushing

## 8. Failed Approaches (Do Not Retry)
- Using `npm install` for deps → breaks pnpm lockfile on Vercel
- Using `tool()` helper with `jsonSchema()` for MCP tools → type errors in v6
- Direct Pipedream API token fetch from this container → network restricted

## 9. Open Questions / Unknowns
- Does Pipedream MCP actually return tools on first chat request? (needs live test)
- What does Pipedream OAuth flow look like for end-user app connections?
- How to handle Pipedream account linking UI for users?

## 10. Next Actions
1. ~~Deploy staged code (timer, auto-continue)~~ ✅ DONE
2. ~~Wire Pipedream MCP~~ ✅ DONE
3. Add Deep Research tool (Tavily or Exa API)
4. Connect PostgreSQL + run migrations
5. Add Browser tool (Playwright headless)
6. Add Code sandbox (Claude Code integration)
7. Add Image generation (DALL-E)
8. Match original UI design (warm cream/green palette)
9. Project management UI + Knowledge Bases + Skills sidebar
10. Phone calls (Twilio + ElevenLabs)

## Credentials Secured
- GOOGLE_GENERATIVE_AI_API_KEY: Set on Vercel ✅
- PIPEDREAM_CLIENT_ID: Set on Vercel ✅
- PIPEDREAM_CLIENT_SECRET: Set on Vercel ✅
- PIPEDREAM_PROJECT_ID: proj_ELs40WX ✅
- PIPEDREAM_PROJECT_ENVIRONMENT: development ✅
- GitHub PAT: stored in Claude session (not committed)

## Credentials Still Needed
- DATABASE_URL (PostgreSQL — Railway or Neon)
- NEXTAUTH_SECRET
- OpenAI API key (for DALL-E image generation)
- Twilio SID + Token + Phone number
- E2B or Claude Code API key
- Tavily or Exa API key (for Deep Research)
- ElevenLabs API key (for voice calls)
