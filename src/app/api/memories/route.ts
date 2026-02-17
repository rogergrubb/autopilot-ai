import { NextResponse } from 'next/server';
import { db } from '@/db';
import { userMemories } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const DEFAULT_USER_ID = 'd30ca60b-0f38-498c-895d-30af8356af4a';

// GET /api/memories — list all user memories
export async function GET() {
  if (!db) return NextResponse.json({ memories: [] });
  try {
    const rows = await db
      .select()
      .from(userMemories)
      .where(eq(userMemories.userId, DEFAULT_USER_ID))
      .orderBy(desc(userMemories.createdAt))
      .limit(200);

    return NextResponse.json({ memories: rows });
  } catch (error) {
    console.error('[Memories GET]', error);
    return NextResponse.json({ memories: [] });
  }
}

// POST /api/memories — import memories (bulk paste or single add)
export async function POST(req: Request) {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    const { raw, source, memories: memoryList } = await req.json();

    // If raw text is provided, parse it into individual memories
    if (raw) {
      const parsed = parseMemories(raw);
      if (parsed.length === 0) {
        return NextResponse.json({ error: 'No memories could be parsed from the input' }, { status: 400 });
      }

      const values = parsed.map(m => ({
        id: nanoid(12),
        userId: DEFAULT_USER_ID,
        content: m.content,
        category: m.category,
        source: source || 'chatgpt',
      }));

      await db.insert(userMemories).values(values);

      return NextResponse.json({
        imported: values.length,
        memories: values,
        message: `Successfully imported ${values.length} memories`,
      });
    }

    // If a structured list is provided
    if (memoryList && Array.isArray(memoryList)) {
      const values = memoryList.map((m: { content: string; category?: string }) => ({
        id: nanoid(12),
        userId: DEFAULT_USER_ID,
        content: m.content,
        category: m.category || 'general',
        source: source || 'manual',
      }));

      await db.insert(userMemories).values(values);

      return NextResponse.json({
        imported: values.length,
        memories: values,
      });
    }

    return NextResponse.json({ error: 'Provide either "raw" text or "memories" array' }, { status: 400 });
  } catch (error) {
    console.error('[Memories POST]', error);
    return NextResponse.json({ error: 'Failed to import memories' }, { status: 500 });
  }
}

// DELETE /api/memories — clear all memories
export async function DELETE() {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    await db.delete(userMemories).where(eq(userMemories.userId, DEFAULT_USER_ID));
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('[Memories DELETE]', error);
    return NextResponse.json({ error: 'Failed to clear memories' }, { status: 500 });
  }
}

/**
 * Parse raw ChatGPT memory export text into individual memories.
 * Handles formats:
 * - Bullet points (- or •)
 * - Numbered lists (1. 2. 3.)
 * - Newline-separated lines
 * - "User likes X... Has a dog named Y... Works in Z..."
 */
function parseMemories(raw: string): { content: string; category: string }[] {
  const memories: { content: string; category: string }[] = [];
  const seen = new Set<string>();

  // Normalize
  let text = raw.trim();

  // Try splitting by common separators
  let lines: string[];

  // Check if it uses bullet points or numbered lists
  if (/^[\s]*[-•*]\s/m.test(text) || /^[\s]*\d+[.)]\s/m.test(text)) {
    lines = text.split(/\n/).map(l => l.replace(/^[\s]*[-•*\d.)]+\s*/, '').trim()).filter(Boolean);
  }
  // Check for "..." separator pattern (ChatGPT memory export style)
  else if (text.includes('...')) {
    lines = text.split(/\.{2,}/).map(l => l.trim()).filter(Boolean);
  }
  // Fall back to newline splitting
  else {
    lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
  }

  for (const line of lines) {
    const content = line.replace(/^[-•*]\s*/, '').trim();
    if (!content || content.length < 3) continue;

    const normalized = content.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    const category = categorizeMemory(content);
    memories.push({ content, category });
  }

  return memories;
}

function categorizeMemory(text: string): string {
  const lower = text.toLowerCase();
  if (/\b(prefer|like|love|enjoy|favorite|hate|dislike)\b/.test(lower)) return 'preferences';
  if (/\b(work|job|company|role|title|manager|team|career|business)\b/.test(lower)) return 'work';
  if (/\b(live|city|country|location|home|address|moved)\b/.test(lower)) return 'location';
  if (/\b(code|program|develop|python|javascript|react|api|software|engineer)\b/.test(lower)) return 'technical';
  if (/\b(name|family|pet|dog|cat|kid|child|spouse|partner|wife|husband)\b/.test(lower)) return 'personal';
  if (/\b(style|tone|format|concise|detailed|brief|verbose)\b/.test(lower)) return 'communication';
  if (/\b(goal|plan|project|build|create|launch|start)\b/.test(lower)) return 'goals';
  return 'general';
}
