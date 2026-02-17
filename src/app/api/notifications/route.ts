import { NextResponse } from 'next/server';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { desc, eq, and, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const DEFAULT_USER_ID = 'd30ca60b-0f38-498c-895d-30af8356af4a';

// GET /api/notifications — list notifications (newest first)
export async function GET(req: Request) {
  if (!db) return NextResponse.json({ notifications: [], unreadCount: 0 });
  try {
    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get('unread') === 'true';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

    const where = unreadOnly
      ? and(eq(notifications.userId, DEFAULT_USER_ID), eq(notifications.read, false))
      : eq(notifications.userId, DEFAULT_USER_ID);

    const rows = await db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    // Get unread count
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, DEFAULT_USER_ID), eq(notifications.read, false)));

    return NextResponse.json({
      notifications: rows,
      unreadCount: Number(countResult[0]?.count || 0),
    });
  } catch (error) {
    console.error('[Notifications GET]', error);
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }
}

// POST /api/notifications — create a notification
export async function POST(req: Request) {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    const { title, body, type, source, chatId, metadata } = await req.json();
    const id = nanoid(12);

    const result = await db
      .insert(notifications)
      .values({
        id,
        userId: DEFAULT_USER_ID,
        title: title || 'Notification',
        body: body || null,
        type: type || 'info',
        source: source || null,
        chatId: chatId || null,
        metadata: metadata || {},
      })
      .returning();

    return NextResponse.json({ notification: result[0] });
  } catch (error) {
    console.error('[Notifications POST]', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}

// PATCH /api/notifications — mark all as read
export async function PATCH() {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.userId, DEFAULT_USER_ID), eq(notifications.read, false)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Notifications PATCH]', error);
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
  }
}

// DELETE /api/notifications — clear all notifications
export async function DELETE() {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    await db.delete(notifications).where(eq(notifications.userId, DEFAULT_USER_ID));
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('[Notifications DELETE]', error);
    return NextResponse.json({ error: 'Failed to clear notifications' }, { status: 500 });
  }
}
