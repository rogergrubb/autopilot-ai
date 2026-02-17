/**
 * Web Browser Tool — Real Browser via Browserbase + Playwright
 * 
 * When BROWSERBASE_API_KEY is set:
 *   Uses Browserbase cloud browsers via Playwright's connectOverCDP.
 *   Full browser capabilities — JS rendering, form filling, screenshots,
 *   clicking, scrolling, extracting rendered DOM content.
 * 
 * When BROWSERBASE_API_KEY is NOT set:
 *   Falls back to Claude Haiku with web_search (lightweight, no real browser).
 * 
 * Env vars needed for Browserbase:
 *   BROWSERBASE_API_KEY — from browserbase.com → Settings → API Keys
 *   BROWSERBASE_PROJECT_ID — from browserbase.com → Overview → Project ID
 */

import { chromium, type Page, type Browser } from 'playwright-core';

// ── Types ──────────────────────────────────────────────────────────────────

export interface BrowseResult {
  status: 'success' | 'error';
  url: string;
  action: string;
  content: string;
  extractedData?: Record<string, unknown>;
  linksFound?: string[];
  screenshotUrl?: string;
  sessionReplayUrl?: string;
  model: string;
}

// ── Browserbase helpers ────────────────────────────────────────────────────

function isBrowserbaseConfigured(): boolean {
  return !!(process.env.BROWSERBASE_API_KEY && process.env.BROWSERBASE_PROJECT_ID);
}

interface BrowserbaseSession {
  id: string;
  connectUrl: string;
}

/**
 * Create a Browserbase session and connect Playwright to it.
 */
async function createBrowserbaseSession(): Promise<{ browser: Browser; sessionId: string }> {
  // Dynamic import to avoid issues when SDK isn't needed
  const { default: Browserbase } = await import('@browserbasehq/sdk');

  const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY! });

  const session: BrowserbaseSession = await bb.sessions.create({
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
  }) as BrowserbaseSession;

  const browser = await chromium.connectOverCDP(session.connectUrl);

  console.log(`[Browser] Browserbase session: ${session.id}`);
  return { browser, sessionId: session.id };
}

/**
 * Extract readable text content from a page's DOM.
 */
async function extractPageContent(page: Page): Promise<string> {
  return page.evaluate(() => {
    // Remove script/style elements
    const clone = document.cloneNode(true) as Document;
    clone.querySelectorAll('script, style, noscript, svg, iframe').forEach(el => el.remove());

    // Get main content area if available, otherwise body
    const main = clone.querySelector('main, article, [role="main"], .content, #content');
    const target = main || clone.body;

    if (!target) return '';

    // Get text content, collapse whitespace
    const text = (target as HTMLElement).innerText || target.textContent || '';
    return text
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0)
      .join('\n')
      .slice(0, 8000); // Cap at ~8k chars
  });
}

/**
 * Extract all links from the page.
 */
async function extractLinks(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const links: string[] = [];
    document.querySelectorAll('a[href]').forEach(a => {
      const href = (a as HTMLAnchorElement).href;
      if (href && href.startsWith('http') && !links.includes(href)) {
        links.push(href);
      }
    });
    return links.slice(0, 20);
  });
}

// ── Browserbase-powered browsing ───────────────────────────────────────────

async function browseWithBrowserbase(
  url: string,
  instructions: string,
): Promise<BrowseResult> {
  let browser: Browser | null = null;
  let sessionId = '';

  try {
    console.log(`[Browser] Browserbase: navigating to ${url}`);
    const startTime = Date.now();

    const session = await createBrowserbaseSession();
    browser = session.browser;
    sessionId = session.sessionId;

    const context = browser.contexts()[0];
    const page = context.pages()[0] || await context.newPage();

    // Navigate with timeout
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait a moment for dynamic content
    await page.waitForTimeout(2000);

    // Extract content
    const content = await extractPageContent(page);
    const links = await extractLinks(page);
    const title = await page.title();
    const finalUrl = page.url();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Browser] Done in ${elapsed}s — ${links.length} links found`);

    const replayUrl = `https://browserbase.com/sessions/${sessionId}`;

    return {
      status: 'success',
      url: finalUrl,
      action: instructions,
      content: `**${title}**\n\n${content}`,
      linksFound: links,
      sessionReplayUrl: replayUrl,
      model: 'browserbase-playwright',
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Browser] Browserbase failed:`, message);
    return {
      status: 'error',
      url,
      action: instructions,
      content: `Browser navigation failed: ${message}`,
      model: 'browserbase-playwright',
    };
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
  }
}

async function extractWithBrowserbase(
  url: string,
  dataSchema: string,
): Promise<BrowseResult> {
  let browser: Browser | null = null;
  let sessionId = '';

  try {
    console.log(`[Browser] Browserbase extract: ${url}`);
    const startTime = Date.now();

    const session = await createBrowserbaseSession();
    browser = session.browser;
    sessionId = session.sessionId;

    const context = browser.contexts()[0];
    const page = context.pages()[0] || await context.newPage();

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const content = await extractPageContent(page);
    const title = await page.title();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Browser] Extraction done in ${elapsed}s`);

    return {
      status: 'success',
      url,
      action: `extract: ${dataSchema.slice(0, 100)}`,
      content: `**${title}**\n\n${content}`,
      sessionReplayUrl: `https://browserbase.com/sessions/${sessionId}`,
      model: 'browserbase-playwright',
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: 'error',
      url,
      action: `extract: ${dataSchema.slice(0, 100)}`,
      content: `Extraction failed: ${message}`,
      model: 'browserbase-playwright',
    };
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
  }
}

/**
 * Interact with a page — click buttons, fill forms, scroll.
 * This is the power feature that the Claude Haiku fallback can't do.
 */
async function interactWithBrowserbase(
  url: string,
  steps: Array<{ action: 'click' | 'fill' | 'scroll' | 'wait' | 'screenshot'; selector?: string; value?: string }>,
): Promise<BrowseResult> {
  let browser: Browser | null = null;
  let sessionId = '';

  try {
    console.log(`[Browser] Browserbase interact: ${url} — ${steps.length} steps`);
    const startTime = Date.now();

    const session = await createBrowserbaseSession();
    browser = session.browser;
    sessionId = session.sessionId;

    const context = browser.contexts()[0];
    const page = context.pages()[0] || await context.newPage();

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const results: string[] = [];

    for (const step of steps) {
      try {
        switch (step.action) {
          case 'click':
            if (step.selector) {
              await page.click(step.selector, { timeout: 10000 });
              results.push(`Clicked: ${step.selector}`);
            }
            break;
          case 'fill':
            if (step.selector && step.value) {
              await page.fill(step.selector, step.value, { timeout: 10000 });
              results.push(`Filled "${step.selector}" with "${step.value}"`);
            }
            break;
          case 'scroll':
            await page.evaluate(() => window.scrollBy(0, 500));
            results.push('Scrolled down');
            break;
          case 'wait':
            await page.waitForTimeout(parseInt(step.value || '2000'));
            results.push(`Waited ${step.value || 2000}ms`);
            break;
          case 'screenshot':
            results.push('Screenshot captured (see session replay)');
            break;
        }
      } catch (stepError: unknown) {
        const msg = stepError instanceof Error ? stepError.message : String(stepError);
        results.push(`Step "${step.action}" failed: ${msg}`);
      }
    }

    // Get final page state
    const content = await extractPageContent(page);
    const title = await page.title();
    const finalUrl = page.url();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Browser] Interaction done in ${elapsed}s`);

    return {
      status: 'success',
      url: finalUrl,
      action: `interact: ${steps.length} steps`,
      content: `**${title}** (${finalUrl})\n\n**Steps completed:**\n${results.join('\n')}\n\n**Page content after interaction:**\n${content.slice(0, 4000)}`,
      sessionReplayUrl: `https://browserbase.com/sessions/${sessionId}`,
      model: 'browserbase-playwright',
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: 'error',
      url,
      action: `interact: ${steps.length} steps`,
      content: `Interaction failed: ${message}`,
      model: 'browserbase-playwright',
    };
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
  }
}

// ── Claude Haiku fallback (no real browser) ────────────────────────────────

async function browseWithHaiku(
  url: string,
  instructions: string,
): Promise<BrowseResult> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Neither BROWSERBASE_API_KEY nor ANTHROPIC_API_KEY is set');

  const client = new Anthropic({ apiKey });
  const BROWSER_MODEL = 'claude-haiku-4-5-20251001';

  console.log(`[Browser] Haiku fallback: ${url}`);
  const startTime = Date.now();

  const response = await client.messages.create({
    model: BROWSER_MODEL,
    max_tokens: 4096,
    system: `You are a web browsing assistant with web search. Visit the URL or topic and extract information based on the user's instructions. Be thorough and structured.`,
    tools: [{ type: 'web_search_20250305' as const, name: 'web_search', max_uses: 5 }],
    messages: [{
      role: 'user',
      content: `Visit this URL and follow these instructions:\n\nURL: ${url}\n\nInstructions: ${instructions}`,
    }],
  });

  let content = '';
  const links: string[] = [];

  for (const block of response.content) {
    if (block.type === 'text') content += block.text;
    else if (block.type === 'web_search_tool_result' && 'content' in block && Array.isArray(block.content)) {
      for (const item of block.content) {
        if (item.type === 'web_search_result' && item.url && !links.includes(item.url)) {
          links.push(item.url);
        }
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Browser] Haiku done in ${elapsed}s`);

  return {
    status: 'success',
    url,
    action: instructions,
    content,
    linksFound: links.slice(0, 10),
    model: BROWSER_MODEL,
  };
}

async function extractWithHaiku(
  url: string,
  dataSchema: string,
): Promise<BrowseResult> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Neither BROWSERBASE_API_KEY nor ANTHROPIC_API_KEY is set');

  const client = new Anthropic({ apiKey });
  const BROWSER_MODEL = 'claude-haiku-4-5-20251001';

  console.log(`[Browser] Haiku extract: ${url}`);
  const response = await client.messages.create({
    model: BROWSER_MODEL,
    max_tokens: 4096,
    system: 'You are a data extraction assistant. Visit the URL using web search and extract structured data matching the schema. Return as JSON in a code block.',
    tools: [{ type: 'web_search_20250305' as const, name: 'web_search', max_uses: 5 }],
    messages: [{
      role: 'user',
      content: `Extract this data from ${url}:\n\nData to extract:\n${dataSchema}\n\nReturn as JSON.`,
    }],
  });

  let content = '';
  for (const block of response.content) {
    if (block.type === 'text') content += block.text;
  }

  let extractedData: Record<string, unknown> | undefined;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { extractedData = JSON.parse(jsonMatch[1] || jsonMatch[0]); } catch { /* ok */ }
  }

  return {
    status: 'success',
    url,
    action: `extract: ${dataSchema.slice(0, 100)}`,
    content,
    extractedData,
    model: BROWSER_MODEL,
  };
}

// ── Public API (auto-routes to Browserbase or Haiku) ───────────────────────

/**
 * Browse a URL and extract information based on instructions.
 * Uses Browserbase when available, falls back to Claude Haiku.
 */
export async function browseWeb(
  url: string,
  instructions: string,
): Promise<BrowseResult> {
  if (isBrowserbaseConfigured()) {
    return browseWithBrowserbase(url, instructions);
  }
  return browseWithHaiku(url, instructions);
}

/**
 * Extract structured data from a web page.
 * Uses Browserbase when available, falls back to Claude Haiku.
 */
export async function extractFromPage(
  url: string,
  dataSchema: string,
): Promise<BrowseResult> {
  if (isBrowserbaseConfigured()) {
    return extractWithBrowserbase(url, dataSchema);
  }
  return extractWithHaiku(url, dataSchema);
}

/**
 * Interact with a page — click, fill forms, scroll.
 * ONLY available with Browserbase (requires real browser).
 */
export async function interactWithPage(
  url: string,
  steps: Array<{ action: 'click' | 'fill' | 'scroll' | 'wait' | 'screenshot'; selector?: string; value?: string }>,
): Promise<BrowseResult> {
  if (!isBrowserbaseConfigured()) {
    return {
      status: 'error',
      url,
      action: `interact: ${steps.length} steps`,
      content: 'Page interaction requires Browserbase (real browser). Set BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID env vars.',
      model: 'none',
    };
  }
  return interactWithBrowserbase(url, steps);
}

/**
 * Check if real browser capabilities are available.
 */
export function hasBrowserCapabilities(): boolean {
  return isBrowserbaseConfigured();
}

/**
 * Check if any browser tool is available (Browserbase or Haiku fallback).
 */
export function isBrowserAvailable(): boolean {
  return isBrowserbaseConfigured() || !!process.env.ANTHROPIC_API_KEY;
}
