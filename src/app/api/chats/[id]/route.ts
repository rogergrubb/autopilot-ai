import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { chats } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/chats/[id] — load a chat with messages
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!db) return NextResponse.json({ error: "No database" }, { status: 503 });
  const { id } = await params;
  try {
    const [chat] = await db.select().from(chats).where(eq(chats.id, id));
    if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ chat });
  } catch (e) {
    console.error("Failed to load chat:", e);
    return NextResponse.json({ error: "Failed to load chat" }, { status: 500 });
  }
}

// PUT /api/chats/[id] — save/update chat messages + title
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!db) return NextResponse.json({ error: "No database" }, { status: 503 });
  const { id } = await params;
  try {
    const body = await req.json();
    const { messages, title, agentRole } = body;

    // Upsert: try update first, create if not exists
    const existing = await db.select({ id: chats.id }).from(chats).where(eq(chats.id, id));
    if (existing.length === 0) {
      await db.insert(chats).values({
        id,
        title: title || "New Chat",
        agentRole: agentRole || "social_strategist",
        messages: messages || [],
      });
    } else {
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (messages !== undefined) updates.messages = messages;
      if (title !== undefined) updates.title = title;
      if (agentRole !== undefined) updates.agentRole = agentRole;
      await db.update(chats).set(updates).where(eq(chats.id, id));
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Failed to save chat:", e);
    return NextResponse.json({ error: "Failed to save chat" }, { status: 500 });
  }
}

// DELETE /api/chats/[id] — delete a chat
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!db) return NextResponse.json({ error: "No database" }, { status: 503 });
  const { id } = await params;
  try {
    await db.delete(chats).where(eq(chats.id, id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Failed to delete chat:", e);
    return NextResponse.json({ error: "Failed to delete chat" }, { status: 500 });
  }
}
