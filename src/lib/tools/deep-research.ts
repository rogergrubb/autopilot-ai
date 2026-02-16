/**
 * Deep Research Tool
 * 
 * Uses Claude Haiku (cheapest model) with built-in web search to perform
 * thorough research on any topic. The main agent delegates research tasks
 * to this sub-agent which searches the web, reads pages, and synthesizes findings.
 * 
 * Cost: ~$0.001-0.005 per research query (Haiku is extremely cheap)
 */

import Anthropic from '@anthropic-ai/sdk';

const RESEARCH_MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 4096;

// Lazy singleton — only created when first research call happens
let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not set — needed for Deep Research tool');
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

export interface ResearchResult {
  status: 'success' | 'error';
  query: string;
  summary: string;
  sources: string[];
  keyFindings: string[];
  confidence: 'high' | 'medium' | 'low';
  model: string;
  searchesPerformed: number;
}

/**
 * Perform deep research on a topic using Claude Haiku + web search.
 * Returns a structured research report.
 */
export async function deepResearch(
  query: string,
  context?: string,
): Promise<ResearchResult> {
  const client = getClient();

  const systemPrompt = `You are a thorough research assistant. Your job is to search the web and provide comprehensive, accurate research reports.

Guidelines:
- Search for multiple angles on the topic
- Cross-reference sources for accuracy
- Distinguish between facts, opinions, and speculation
- Note any conflicting information found
- Provide specific data points, dates, and numbers when available
- Always cite your sources

${context ? `Additional context from the user: ${context}` : ''}

Respond with a clear, well-structured research report. Start with a brief executive summary, then key findings, then detailed analysis.`;

  try {
    console.log(`[Research] Starting deep research: "${query.slice(0, 80)}..."`);
    const startTime = Date.now();

    const response = await client.messages.create({
      model: RESEARCH_MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      tools: [
        {
          type: 'web_search_20250305' as const,
          name: 'web_search',
          max_uses: 10,
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Research this thoroughly: ${query}`,
        },
      ],
    });

    // Extract text blocks and count search uses
    let summary = '';
    let searchCount = 0;
    const sources: string[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        summary += block.text;
      } else if (block.type === 'web_search_tool_result') {
        searchCount++;
        // Extract source URLs from search results
        if ('content' in block && Array.isArray(block.content)) {
          for (const item of block.content) {
            if (item.type === 'web_search_result' && item.url) {
              if (!sources.includes(item.url)) {
                sources.push(item.url);
              }
            }
          }
        }
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Research] Completed in ${elapsed}s — ${searchCount} searches, ${sources.length} sources`);

    // Extract key findings (lines that start with bullet-like patterns)
    const keyFindings = summary
      .split('\n')
      .filter(line => /^[\s]*[-•*]\s/.test(line) || /^\d+[.)]\s/.test(line))
      .map(line => line.replace(/^[\s]*[-•*]\s*/, '').replace(/^\d+[.)]\s*/, '').trim())
      .filter(line => line.length > 20)
      .slice(0, 8);

    return {
      status: 'success',
      query,
      summary,
      sources: sources.slice(0, 15), // Cap at 15 sources
      keyFindings,
      confidence: sources.length >= 5 ? 'high' : sources.length >= 2 ? 'medium' : 'low',
      model: RESEARCH_MODEL,
      searchesPerformed: searchCount,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Research] Failed:`, message);

    return {
      status: 'error',
      query,
      summary: `Research failed: ${message}`,
      sources: [],
      keyFindings: [],
      confidence: 'low',
      model: RESEARCH_MODEL,
      searchesPerformed: 0,
    };
  }
}
