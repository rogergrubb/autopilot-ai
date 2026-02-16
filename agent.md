# Agent Memory – DoAnythingClone (MultiPowerAI DoAnything)

## 1. Project Overview
- **What**: Full clone of doanything.com - autonomous AI agent platform where agents work on complex projects for weeks/months
- **Brand**: MultiPowerAI / NumberOneSonSoftware
- **Original Built By**: Garrett Scott, CEO of Pipedream Labs
- **Original Framework**: MEESEEKS
- **Original Open Source Ref**: PipedreamHQ/mcp-chat (Next.js + AI SDK + Pipedream MCP)
- **Non-goals**: Not replicating Pipedream infrastructure, building equivalent autonomous functionality

## 2. Definition of Done
### Functional
- [ ] Agent identity (own name + email)
- [ ] 10+ tools: Email, Phone, Browser, Research, Code, Docs, Websites, Images, Subagents, Slides
- [ ] Multi-AI (Claude, Gemini, GPT) via Vercel AI SDK
- [ ] 3000+ app connections via Pipedream MCP
- [ ] Self-reflection loop (60s timeout → autonomous retry)
- [ ] SMS notifications via Twilio
- [ ] Smart pacing (pause/resume)
- [ ] Project-level task management
- [ ] Org Chart view
- [ ] Chat UI matching DoAnything design

### Test Scenarios
1. Write and publish a book (outline → Amazon)
2. Start and run a business (idea → revenue)
3. Build newsletter to 2,000 subscribers

## 3. Current State
- **Build**: PHASE 1 COMPLETE - Deployed to Vercel
- **URL**: https://doanything-clone.vercel.app
- **GitHub**: https://github.com/rogergrubb/doanything-clone
- **Vercel Project ID**: prj_N0Lkb3kdPWv249sCj1jdN0gBAjwy
- **Team ID**: team_h4aVKRrQ17g4dZCH1XgVsMR5
- **Build Status**: ✅ Compiles clean, deployed to production
- **Blockers**: None

### Credentials Secured
- Pipedream Client ID: [REDACTED]
- Pipedream Client Secret: [REDACTED]
- Pipedream Project ID: proj_ELs40WX
- Gemini 2.5 Pro Key: [REDACTED]
- GitHub Token: [REDACTED]
- Vercel Token: [REDACTED]

## 4. Architecture
### Stack
- Next.js 15 + React 19 + TypeScript + Tailwind + Vercel AI SDK
- PostgreSQL + Drizzle ORM on Railway
- Auth.js (NextAuth v5)
- Pipedream MCP (remote.mcp.pipedream.net) for 3000+ apps
- Gemini 2.5 Pro (primary), GPT-4o (secondary), Claude (tertiary)
- Twilio (SMS/voice), E2B (code sandbox), Playwright (browser), DALL-E (images)

### Agent Loop (MEESEEKS-equivalent)
User goal → Task tree → For each: Reason → Act → Observe → Reflect → Repeat

## 5. Known Landmines
- Anthropic API limited until March 1, 2026
- Roger = GUI only, no CLI
- Pipedream free tier has limits
- Long-running agents need durable execution on Railway

## 6. Debug History
- AI SDK v6 uses both `parameters` and `inputSchema` for tools (both work)
- `DefaultChatTransport` is in `ai` package, not `@ai-sdk/react`
- `toUIMessageStreamResponse()` is the correct response method for streaming chat
- DATABASE_URL must be optional for Vercel builds without DB

## 7. Proven Patterns
- Next.js 16 + AI SDK 6 + Tailwind CSS 4 all work together
- `pnpm` as package manager matches PipedreamHQ reference
- Zustand for client state is clean and lightweight
- Make DB connection lazy/optional for build-time safety
- Vercel CLI deploy with `--prod --token --yes` flags works from CI

## 8. Failed Approaches
- Env vars using `process.env.DATABASE_URL!` crashes build without DB
- Two competing store files (chat-store vs lib/store) causes confusion - consolidated to lib/store

## 9. Open Questions - DEFERRED TO LATER PHASES
1. Twilio: Account SID, Auth Token, Phone # (Phase 4)
2. OpenAI: API key (Phase 3 - images/code)
3. E2B: API key (Phase 3 - code sandbox)
4. ElevenLabs: API key (Phase 4 - voice)
5. Tavily: API key (Phase 3 - research)
6. Agent email domain (Phase 4)
7. Custom domain for deployment

## 10. Next Actions
1. ✅ Deep dive research complete
2. ✅ Agent.md updated
3. ✅ Pipedream credentials secured
4. ✅ Phase 1 DEPLOYED: https://doanything-clone.vercel.app
5. → Test chat functionality (send message, verify Gemini responds)
6. → Phase 2: Agent engine + task tree + ReAct loop + Railway background workers
7. → Phase 3: Tool system + Pipedream MCP integration
8. → Phase 4: Communications + subagents
