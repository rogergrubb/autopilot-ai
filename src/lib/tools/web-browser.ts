/**
 * Web Browser Tool
 * 
 * Uses Claude Haiku with web search to browse, read, and extract information
 * from web pages. Acts as a lightweight browser — can visit URLs, read content,
 * fill out understanding of pages, and extract structured data.
 * 
 * This avoids needing Playwright/Puppeteer (too heavy for serverless).
 * For form filling, screenshots, or JS-rendered pages, we'd need Browserbase.
 */

import Anthropic from '@anthropic-ai/sdk';

const BROWSER_MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 4096;

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

export interface BrowseResult {
  status: 'success' | 'error';
  url: string;
  action: string;
  content: string;
  extractedData?: Record<string, unknown>;
  linksFound?: string[];
  model: string;
}

/**
 * Browse a URL and extract information based on instructions.
 */
export async function browseWeb(
  url: string,
  instructions: string,
): Promise<BrowseResult> {
  const client = getClient();

  const systemPrompt = `You are a web browsing assistant. You have access to web search to find and read web pages.

Your task is to visit the specified URL or find specific information on the web, then extract and organize the content based on the user's instructions.

Guidelines:
- Search for the URL or topic to access its content
- Extract the specific information requested
- Organize data in a clear, structured format
- If you can't access a page directly, search for cached or alternative sources
- Report what you found accurately, noting any limitations`;

  try {
    console.log(`[Browser] Browsing: ${url} — "${instructions.slice(0, 60)}..."`);
    const startTime = Date.now();

    const response = await client.messages.create({
      model: BROWSER_MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      tools: [
        {
          type: 'web_search_20250305' as const,
          name: 'web_search',
          max_uses: 5,
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Visit this URL and follow these instructions:\n\nURL: ${url}\n\nInstructions: ${instructions}`,
        },
      ],
    });

    let content = '';
    const links: string[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        content += block.text;
      } else if (block.type === 'web_search_tool_result' && 'content' in block && Array.isArray(block.content)) {
        for (const item of block.content) {
          if (item.type === 'web_search_result' && item.url && !links.includes(item.url)) {
            links.push(item.url);
          }
        }
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Browser] Done in ${elapsed}s — ${links.length} links found`);

    return {
      status: 'success',
      url,
      action: instructions,
      content,
      linksFound: links.slice(0, 10),
      model: BROWSER_MODEL,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Browser] Failed:`, message);
    return {
      status: 'error',
      url,
      action: instructions,
      content: `Browse failed: ${message}`,
      model: BROWSER_MODEL,
    };
  }
}

/**
 * Extract structured data from a web page.
 */
export async function extractFromPage(
  url: string,
  dataSchema: string,
): Promise<BrowseResult> {
  const client = getClient();

  try {
    console.log(`[Browser] Extracting data from: ${url}`);
    const startTime = Date.now();

    const response = await client.messages.create({
      model: BROWSER_MODEL,
      max_tokens: MAX_TOKENS,
      system: `You are a data extraction assistant. Visit the given URL using web search and extract structured data matching the requested schema. Return the data as a valid JSON object within a code block.`,
      tools: [
        {
          type: 'web_search_20250305' as const,
          name: 'web_search',
          max_uses: 5,
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Extract this data from ${url}:\n\nData to extract:\n${dataSchema}\n\nReturn as JSON.`,
        },
      ],
    });

    let content = '';
    for (const block of response.content) {
      if (block.type === 'text') content += block.text;
    }

    // Try to parse JSON from the response
    let extractedData: Record<string, unknown> | undefined;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        extractedData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } catch {
        // JSON parse failed, that's ok — content still has the text
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Browser] Extraction done in ${elapsed}s`);

    return {
      status: 'success',
      url,
      action: `extract: ${dataSchema.slice(0, 100)}`,
      content,
      extractedData,
      model: BROWSER_MODEL,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: 'error',
      url,
      action: `extract: ${dataSchema.slice(0, 100)}`,
      content: `Extraction failed: ${message}`,
      model: BROWSER_MODEL,
    };
  }
}
