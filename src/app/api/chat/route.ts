import { streamText, tool, stepCountIs, type ToolSet } from 'ai';
import { z } from 'zod';
import { primaryModel, SOCIAL_STRATEGIST_PROMPT, PRODUCTS } from '@/lib/ai/config';
import { MCPSessionManager } from '@/lib/mcp-session';

// Vercel hobby = 60s, pro = 300s. Set high so multi-step agent doesn't get cut off.
export const maxDuration = 300;

const MCP_BASE_URL = process.env.MCP_SERVER || 'https://remote.mcp.pipedream.net';

// Check if Pipedream is configured
const isPipedreamConfigured = !!(
  process.env.PIPEDREAM_CLIENT_ID &&
  process.env.PIPEDREAM_CLIENT_SECRET &&
  process.env.PIPEDREAM_PROJECT_ID
);

/** Built-in tools that always work (no external deps) */
function getLocalTools(): ToolSet {
  return {
    createSocialPost: tool({
      description: 'Create a social media post for one of the platforms being promoted.',
      inputSchema: z.object({
        platform: z.enum(['twitter', 'instagram', 'linkedin', 'tiktok', 'reddit', 'threads', 'facebook']),
        product: z.enum(['papervault', 'sellfast', 'braincandy']),
        content: z.string().describe('The post content'),
        hashtags: z.array(z.string()).optional(),
        hook: z.string().optional().describe('The attention-grabbing first line'),
        callToAction: z.string().optional(),
        contentType: z.enum(['value', 'promotional', 'engagement', 'trending', 'story', 'educational']),
      }),
      execute: async ({ platform, product, content, hashtags, hook, callToAction, contentType }) => {
        const productInfo = PRODUCTS[product as keyof typeof PRODUCTS];
        return {
          status: 'drafted',
          platform,
          product: productInfo.name,
          url: productInfo.url,
          content: hook ? `${hook}\n\n${content}` : content,
          hashtags: hashtags || [],
          callToAction: callToAction || `Check it out at ${productInfo.url}`,
          contentType,
          characterCount: content.length,
          createdAt: new Date().toISOString(),
        };
      },
    }),

    createContentCalendar: tool({
      description: 'Generate a content calendar with scheduled posts across platforms',
      inputSchema: z.object({
        durationDays: z.number().describe('Number of days to plan'),
        postsPerDay: z.number().default(3),
        platforms: z.array(z.enum(['twitter', 'instagram', 'linkedin', 'tiktok', 'reddit', 'threads'])),
        focusProduct: z.enum(['papervault', 'sellfast', 'braincandy', 'all']).optional(),
      }),
      execute: async ({ durationDays, postsPerDay, platforms, focusProduct }) => {
        return {
          status: 'generated',
          durationDays,
          postsPerDay,
          totalPosts: durationDays * postsPerDay,
          platforms,
          focusProduct: focusProduct || 'all',
          message: `Content calendar created for ${durationDays} days with ${postsPerDay} posts/day across ${platforms.join(', ')}`,
        };
      },
    }),

    analyzeAudience: tool({
      description: 'Analyze target audience for a product and suggest content strategy',
      inputSchema: z.object({
        product: z.enum(['papervault', 'sellfast', 'braincandy']),
        platform: z.enum(['twitter', 'instagram', 'linkedin', 'tiktok', 'reddit', 'threads']),
      }),
      execute: async ({ product, platform }) => {
        const productInfo = PRODUCTS[product as keyof typeof PRODUCTS];
        return {
          product: productInfo.name,
          platform,
          targetAudience: productInfo.audience,
          themes: productInfo.themes,
          voice: productInfo.voice,
        };
      },
    }),

    researchTrending: tool({
      description: 'Research trending topics relevant to the products being promoted',
      inputSchema: z.object({
        platform: z.enum(['twitter', 'instagram', 'linkedin', 'tiktok', 'reddit']),
        industry: z.string().describe('Industry or topic area to research'),
      }),
      execute: async ({ platform, industry }) => {
        return {
          platform,
          industry,
          note: 'Live trending data available when Pipedream MCP connected',
          suggestedTopics: [
            'Tax season stress and document management',
            'Side hustle culture and local selling',
            'AI tools for productivity',
            'Financial literacy and organization',
            'Online marketplace safety tips',
          ],
        };
      },
    }),

    generateHashtags: tool({
      description: 'Generate relevant hashtags for a post',
      inputSchema: z.object({
        product: z.enum(['papervault', 'sellfast', 'braincandy']),
        topic: z.string(),
        platform: z.enum(['twitter', 'instagram', 'linkedin', 'tiktok']),
      }),
      execute: async ({ product, topic, platform }) => {
        const hashtagSets: Record<string, string[]> = {
          papervault: ['#FinancialOrganization', '#TaxSeason', '#Adulting', '#PrivacyFirst', '#PaperFree', '#AIFinance', '#LifeAdmin'],
          sellfast: ['#LocalDeals', '#BuyLocal', '#SellFast', '#Marketplace', '#SideHustle', '#Declutter', '#NoScams'],
          braincandy: ['#BrainCandy', '#LearnSomethingNew', '#FunFacts', '#CuriousMinds', '#SelfImprovement', '#BrainTeaser'],
        };
        return { hashtags: hashtagSets[product] || [], topic, platform };
      },
    }),
  };
}

export async function POST(req: Request) {
  const { messages, agentRole = 'social_strategist' } = await req.json();

  const systemPrompt = agentRole === 'social_strategist'
    ? SOCIAL_STRATEGIST_PROMPT
    : 'You are a helpful AI assistant.';

  // Start with local tools
  const localTools = getLocalTools();

  // Try to load MCP tools from Pipedream (if configured)
  let mcpSession: MCPSessionManager | null = null;
  let allTools: ToolSet = localTools;

  if (isPipedreamConfigured) {
    try {
      // Use a stable user ID. In production this comes from auth session.
      const userId = 'default-user';
      const chatId = `chat-${Date.now()}`;
      mcpSession = new MCPSessionManager(MCP_BASE_URL, userId, chatId);
      const mcpTools = await mcpSession.tools({ useCache: false });

      // Merge: local tools take priority (same name = local wins)
      allTools = { ...mcpTools, ...localTools };
      console.log(`[Chat] Loaded ${Object.keys(mcpTools).length} MCP tools + ${Object.keys(localTools).length} local tools`);
    } catch (error) {
      console.error('[Chat] MCP connection failed, using local tools only:', error);
      allTools = localTools;
    }
  } else {
    console.log('[Chat] Pipedream not configured, using local tools only');
  }

  const result = streamText({
    model: primaryModel,
    system: systemPrompt,
    messages,
    // Allow up to 8 tool-call roundtrips before stopping
    stopWhen: stepCountIs(8),
    tools: allTools,
  });

  return result.toUIMessageStreamResponse();
}
