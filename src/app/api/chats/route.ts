import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { chats } from "@/db/schema";
import { desc } from "drizzle-orm";

// GET /api/chats — list all chats (newest first)
export async function GET() {
  if (!db) {
    return NextResponse.json({ chats: [] });
  }
  try {
    const rows = await db
      .select({
        id: chats.id,
        title: chats.title,
        agentRole: chats.agentRole,
        createdAt: chats.createdAt,
        updatedAt: chats.updatedAt,
      })
      .from(chats)
      .orderBy(desc(chats.updatedAt))
      .limit(50);
    return NextResponse.json({ chats: rows });
  } catch (e) {
    console.error("Failed to list chats:", e);
    return NextResponse.json({ chats: [] });
  }
}

// POST /api/chats — create a new chat
export async function POST(req: NextRequest) {
  if (!db) {
    return NextResponse.json({ error: "No database" }, { status: 503 });
  }
  try {
    const body = await req.json();
    const { id, title, agentRole } = body;
    const [row] = await db
      .insert(chats)
      .values({
        id,
        title: title || "New Chat",
        agentRole: agentRole || "social_strategist",
        messages: [],
      })
      .returning();
    return NextResponse.json({ chat: row });
  } catch (e) {
    console.error("Failed to create chat:", e);
    return NextResponse.json({ error: "Failed to create chat" }, { status: 500 });
  }
}
