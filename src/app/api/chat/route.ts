import { streamText, tool } from 'ai';
import { z } from 'zod';
import { primaryModel, SOCIAL_STRATEGIST_PROMPT, PRODUCTS } from '@/lib/ai/config';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages, agentRole = 'social_strategist' } = await req.json();

  const systemPrompt = agentRole === 'social_strategist' 
    ? SOCIAL_STRATEGIST_PROMPT 
    : 'You are a helpful AI assistant.';

  const result = streamText({
    model: primaryModel,
    system: systemPrompt,
    messages,
    tools: {
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
    },
  });

  return result.toUIMessageStreamResponse();
}
