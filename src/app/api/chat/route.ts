import { streamText, tool, stepCountIs, convertToModelMessages, type ToolSet } from 'ai';
import { z } from 'zod';
import { primaryModel, getModel, SOCIAL_STRATEGIST_PROMPT, PRODUCTS } from '@/lib/ai/config';
import { MCPSessionManager } from '@/lib/mcp-session';
import { deepResearch } from '@/lib/tools/deep-research';
import { browseWeb, extractFromPage, interactWithPage, isBrowserAvailable, hasBrowserCapabilities } from '@/lib/tools/web-browser';
import { generateImage } from '@/lib/tools/image-gen';
import { executeCode, isCodeSandboxAvailable } from '@/lib/tools/code-sandbox';
import { selfReflect, planNextSteps } from '@/lib/tools/reasoning';
import { searchKnowledge } from '@/lib/tools/knowledge-search';
import { sendNotification } from '@/lib/tools/notifications';
import { makePhoneCall } from '@/lib/tools/phone-call';
import { createAutonomousTask, checkTaskStatus } from '@/lib/tools/autonomous-task';
import { postToReddit, postToTwitter, postToFacebook, postToLinkedIn } from '@/lib/social/post';
import type { VoiceName } from '@/lib/video/elevenlabs';
import { db } from '@/db';
import { userMemories } from '@/db/schema';
import { eq } from 'drizzle-orm';

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

    // Reasoning & self-reflection tools (always available)
    selfReflect,
    planNextSteps,
    searchKnowledge,
    sendNotification,
    makePhoneCall,
    createAutonomousTask,
    checkTaskStatus,

    // Deep Research — delegates to Claude Haiku with web search
    // Only available when ANTHROPIC_API_KEY is set
    ...(process.env.ANTHROPIC_API_KEY ? {
      deepResearch: tool({
        description: 'Perform thorough web research on any topic. Uses an AI sub-agent with web search to find current information, cross-reference sources, and produce a comprehensive research report. Use this for: market research, competitor analysis, fact-checking, trend analysis, technical research, news gathering, and any task requiring up-to-date web information.',
        inputSchema: z.object({
          query: z.string().describe('The research question or topic to investigate thoroughly'),
          context: z.string().optional().describe('Additional context to guide the research focus'),
        }),
        execute: async ({ query, context }) => {
          return await deepResearch(query, context);
        },
      }),
    } : {}),

    // Web Browser — uses Browserbase (real browser) or Claude Haiku fallback
    // Available when BROWSERBASE_API_KEY or ANTHROPIC_API_KEY is set
    ...(isBrowserAvailable() ? {
      browseWeb: tool({
        description: 'Browse a web page and extract information. Uses a real cloud browser (Browserbase + Playwright) to navigate URLs, read page content, handle JavaScript-rendered sites, and follow instructions about what to look for. Use for: reading articles, checking website content, monitoring pages, gathering specific data from URLs, viewing JS-heavy single-page apps.',
        inputSchema: z.object({
          url: z.string().describe('The URL to visit and read'),
          instructions: z.string().describe('What to look for or extract from the page'),
        }),
        execute: async ({ url, instructions }) => {
          return await browseWeb(url, instructions);
        },
      }),

      extractData: tool({
        description: 'Extract structured data from a web page. Visits a URL with a real browser and pulls out specific fields. Use for: scraping product info, extracting contact details, pulling pricing data, reading tables, getting data from JS-rendered pages.',
        inputSchema: z.object({
          url: z.string().describe('The URL to extract data from'),
          dataSchema: z.string().describe('Description of the data fields to extract, e.g. "product name, price, rating, number of reviews"'),
        }),
        execute: async ({ url, dataSchema }) => {
          return await extractFromPage(url, dataSchema);
        },
      }),
    } : {}),

    // Page Interaction — ONLY available with Browserbase (needs real browser)
    // Enables clicking, filling forms, scrolling — things only a real browser can do
    ...(hasBrowserCapabilities() ? {
      interactWithPage: tool({
        description: 'Interact with a web page using a real browser — click buttons, fill out forms, scroll, and wait for elements. This is for ACTIVE interaction, not just reading. Use for: signing up for services, filling out forms, clicking through multi-step flows, accepting terms, logging into websites. Each step specifies an action (click/fill/scroll/wait) and a CSS selector.',
        inputSchema: z.object({
          url: z.string().describe('The URL to navigate to before interacting'),
          steps: z.array(z.object({
            action: z.enum(['click', 'fill', 'scroll', 'wait', 'screenshot']).describe('The action to perform'),
            selector: z.string().optional().describe('CSS selector for the element to interact with (required for click/fill)'),
            value: z.string().optional().describe('Value to type (for fill action) or milliseconds to wait (for wait action)'),
          })).describe('Ordered list of interaction steps to perform on the page'),
        }),
        execute: async ({ url, steps }) => {
          return await interactWithPage(url, steps);
        },
      }),
    } : {}),

    // Image Generation — requires OPENAI_API_KEY
    ...(process.env.OPENAI_API_KEY ? {
      generateImage: tool({
        description: 'Generate an image from a text description using DALL-E 3. Creates high-quality images for social media posts, marketing materials, illustrations, concepts, and any visual content. Returns an image URL.',
        inputSchema: z.object({
          prompt: z.string().describe('Detailed description of the image to generate'),
          size: z.enum(['1024x1024', '1792x1024', '1024x1792']).optional().describe('Image dimensions: square (1024x1024), landscape (1792x1024), or portrait (1024x1792)'),
          quality: z.enum(['standard', 'hd']).optional().describe('Image quality: standard (~$0.04) or hd (~$0.08)'),
          style: z.enum(['vivid', 'natural']).optional().describe('Style: vivid (dramatic/hyper-real) or natural (more realistic)'),
        }),
        execute: async ({ prompt, size, quality, style }) => {
          return await generateImage(prompt, { size, quality, style });
        },
      }),
    } : {}),

    // ── Code Sandbox (E2B) ────────────────────────────────────────────
    executeCode: tool({
      description: 'Execute Python or JavaScript code in a secure cloud sandbox. Use for data analysis, calculations, file generation, web scraping scripts, API calls, chart creation, and any computational task. Can install pip/npm packages. Returns stdout, stderr, and rich results (text, images, HTML, JSON).',
      inputSchema: z.object({
        code: z.string().describe('The code to execute'),
        language: z.enum(['python', 'javascript']).optional().describe('Programming language (default: python)'),
        packages: z.array(z.string()).optional().describe('Packages to install before execution (e.g. ["pandas", "matplotlib"])'),
      }),
      execute: async ({ code, language, packages }) => {
        return await executeCode(code, language || 'python', packages);
      },
    }),

    // ── Social Posting (Pipedream Connect) ─────────────────────────────
    // These tools actually publish content to social platforms.
    // If the account isn't connected, they return a connect URL for the user.
    ...(isPipedreamConfigured ? {
      publishToReddit: tool({
        description: 'Actually publish a post to a Reddit subreddit. Requires a connected Reddit account. If not connected, returns a link for the user to connect their account. Use this after drafting content with createSocialPost when the user wants to actually post it live.',
        inputSchema: z.object({
          subreddit: z.string().describe('The subreddit to post to (e.g. "Flipping" or "r/Flipping")'),
          title: z.string().describe('The post title'),
          content: z.string().describe('The post body text'),
        }),
        execute: async ({ subreddit, title, content }) => {
          return await postToReddit(subreddit, title, content);
        },
      }),

      publishToTwitter: tool({
        description: 'Actually publish a tweet on Twitter/X. Requires a connected Twitter account. Max 280 characters. If not connected, returns a link for the user to connect their account.',
        inputSchema: z.object({
          content: z.string().describe('The tweet text (max 280 characters)'),
        }),
        execute: async ({ content }) => {
          return await postToTwitter(content);
        },
      }),

      publishToFacebook: tool({
        description: 'Publish a post to a Facebook Page via Pipedream. Requires a connected Facebook Pages account. The pageId can be a numeric ID like "61588134012621", a URL like "https://www.facebook.com/profile.php?id=61588134012621", or a page slug. NOTE: Facebook profile.php?id= URLs for business pages ARE valid Facebook Pages — do not reject them. If the user provides any Facebook URL or numeric ID, pass it as pageId and let the tool handle extraction. If no pageId is provided, the tool will try to post to the default connected page.',
        inputSchema: z.object({
          content: z.string().describe('The post text'),
          pageId: z.string().optional().describe('Facebook Page ID (numeric), URL, or page slug. URLs like profile.php?id=XXXXX are valid Page URLs.'),
        }),
        execute: async ({ content, pageId }) => {
          return await postToFacebook(content, pageId);
        },
      }),

      publishToLinkedIn: tool({
        description: 'Actually publish a post to LinkedIn. Requires a connected LinkedIn account. If not connected, returns a link for the user to connect their account.',
        inputSchema: z.object({
          content: z.string().describe('The post text'),
          url: z.string().optional().describe('Optional URL to include in the post'),
        }),
        execute: async ({ content, url }) => {
          return await postToLinkedIn(content, url);
        },
      }),
    } : {}),

    // ── Video Generation Tools ────────────────────────────────────────────
    startVideoGeneration: tool({
      description: 'Start generating a short-form marketing video using AI (Veo 3.1). This starts an async operation that takes 1-6 minutes. Returns an operationName that you MUST pass to checkVideoStatus to poll for completion. Call checkVideoStatus every 15 seconds until done.',
      inputSchema: z.object({
        prompt: z.string().describe('Detailed prompt describing the video scene, style, camera angles, and motion. Be specific and cinematic.'),
        aspectRatio: z.enum(['9:16', '16:9']).optional().describe('9:16 for shorts/reels (default), 16:9 for landscape'),
        resolution: z.enum(['720p', '1080p']).optional().describe('Video resolution (default 720p)'),
        voiceoverScript: z.string().optional().describe('Narration script for 11Labs voiceover (generated when video is ready)'),
        voice: z.enum(['rachel', 'drew', 'clyde', 'domi', 'dave', 'fin', 'sarah', 'adam', 'sam']).optional().describe('Voice for voiceover'),
        title: z.string().optional().describe('Title for the video'),
        description: z.string().optional().describe('Description/caption for the video'),
      }),
      execute: async ({ prompt, aspectRatio, resolution, voiceoverScript, voice, title, description }) => {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fullsendai.vercel.app';
          const response = await fetch(`${baseUrl}/api/video/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, aspectRatio, resolution, voiceoverScript, voice, title, description }),
          });
          const result = await response.json();
          if (!response.ok) return { error: result.error || 'Failed to start video generation', details: result.details };
          return {
            success: true,
            operationName: result.operationName,
            model: result.model,
            config: result.config,
            message: `Video generation started with ${result.model}. Operation: ${result.operationName}. This takes 1-6 minutes. Use checkVideoStatus with this operationName to poll for completion.`,
          };
        } catch (err: unknown) {
          return { error: err instanceof Error ? err.message : 'Failed to start video generation' };
        }
      },
    }),

    checkVideoStatus: tool({
      description: 'Check the status of an async Veo video generation. Call this with the operationName from startVideoGeneration. If status is "processing", wait ~15 seconds and call again. If status is "complete", the video is ready.',
      inputSchema: z.object({
        operationName: z.string().describe('The operation name returned by startVideoGeneration'),
        voiceoverScript: z.string().optional().describe('Narration script for voiceover (only processed when video is complete)'),
        voice: z.string().optional().describe('Voice for voiceover'),
      }),
      execute: async ({ operationName, voiceoverScript, voice }) => {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fullsendai.vercel.app';
          const response = await fetch(`${baseUrl}/api/video/poll`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operationName, voiceoverScript, voice }),
          });
          const result = await response.json();
          if (!response.ok && result.status !== 'processing') {
            return { error: result.error || 'Video poll failed' };
          }
          if (result.status === 'processing') {
            return {
              status: 'processing',
              operationName,
              message: 'Video is still generating. Call checkVideoStatus again in ~15 seconds.',
            };
          }
          // Complete! Return metadata (not the full base64)
          return {
            status: 'complete',
            operationName,
            video: { size: result.video?.size, mimeType: result.video?.mimeType },
            voiceover: result.voiceover ? { size: result.voiceover.size } : undefined,
            voiceoverError: result.voiceoverError,
            message: `Video generated! ${result.video?.size ? Math.round(result.video.size / 1024) + 'KB' : 'Ready'}. ${result.voiceover ? 'Voiceover also generated.' : ''}`,
          };
        } catch (err: unknown) {
          return { error: err instanceof Error ? err.message : 'Failed to check video status' };
        }
      },
    }),

    generateVoiceover: tool({
      description: 'Generate a professional AI voiceover using 11Labs. Creates high-quality narration audio from text. Great for video narration, podcast intros, or audio content.',
      inputSchema: z.object({
        text: z.string().describe('The text to convert to speech'),
        voice: z.enum(['rachel', 'drew', 'clyde', 'domi', 'dave', 'fin', 'sarah', 'adam', 'sam']).optional()
          .describe('Voice to use. adam=deep narrator (default), rachel=calm female, drew=confident male, sarah=soft female'),
      }),
      execute: async ({ text, voice }) => {
        try {
          const { generateVoiceover } = await import('@/lib/video/elevenlabs');
          const audio = await generateVoiceover({ text, voice: voice as VoiceName });
          return {
            success: true,
            audioSize: audio.length,
            voice: voice || 'adam',
            message: `Voiceover generated: ${Math.round(audio.length / 1024)}KB audio file`,
          };
        } catch (err: unknown) {
          return { error: err instanceof Error ? err.message : 'Voiceover generation failed' };
        }
      },
    }),
  };
}

export async function POST(req: Request) {
  const { messages, agentRole = 'social_strategist', model: modelName } = await req.json();

  let systemPrompt = agentRole === 'social_strategist'
    ? SOCIAL_STRATEGIST_PROMPT
    : 'You are a helpful AI assistant.';

  // Load user memories and inject into system prompt
  if (db) {
    try {
      const memories = await db
        .select({ content: userMemories.content, category: userMemories.category })
        .from(userMemories)
        .where(eq(userMemories.userId, 'd30ca60b-0f38-498c-895d-30af8356af4a'))
        .limit(100);

      if (memories.length > 0) {
        const memoryBlock = memories.map(m => `- [${m.category}] ${m.content}`).join('\n');
        systemPrompt += `\n\n## User Context (Imported Memories)\nYou know the following about this user. Use this naturally in your responses without mentioning "memories" — just act on the knowledge:\n${memoryBlock}`;
      }
    } catch (e) {
      console.error('[Chat] Failed to load user memories:', e);
    }
  }

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
      
      // Timeout MCP connection after 8 seconds — don't block chat if Pipedream is slow
      const mcpTools = await Promise.race([
        mcpSession.tools({ useCache: false }),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('MCP connection timeout (8s)')), 8000)),
      ]);

      if (mcpTools) {
        // Merge: local tools take priority (same name = local wins)
        allTools = { ...mcpTools, ...localTools };
        console.log(`[Chat] Loaded ${Object.keys(mcpTools).length} MCP tools + ${Object.keys(localTools).length} local tools`);
      }
    } catch (error) {
      console.error('[Chat] MCP connection failed, using local tools only:', error);
      if (mcpSession) mcpSession.close();
      mcpSession = null;
      allTools = localTools;
    }
  } else {
    console.log('[Chat] Pipedream not configured, using local tools only');
  }

  const selectedModel = modelName ? getModel(modelName) : primaryModel;
  
  // Convert UIMessages from frontend to ModelMessages for streamText
  const modelMessages = await convertToModelMessages(messages);
  console.log(`[Chat] Using model: ${modelName || 'default'}, tools: ${Object.keys(allTools).length}, messages: ${modelMessages.length}`);

  try {
    const result = streamText({
      model: selectedModel,
      system: systemPrompt,
      messages: modelMessages,
      // Allow up to 8 tool-call roundtrips before stopping
      stopWhen: stepCountIs(8),
      tools: allTools,
      onError: ({ error }) => {
        console.error('[Chat] Stream error from model:', error);
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('[Chat] Stream error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate response. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
