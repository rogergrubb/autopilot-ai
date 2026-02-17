import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { nanoid } from 'nanoid';

const DEFAULT_USER_ID = 'd30ca60b-0f38-498c-895d-30af8356af4a';

/**
 * Send a notification to the user's inbox.
 * Use this to flag important findings, completed tasks, reminders, or alerts.
 */
export const sendNotification = tool({
  description: 'Send a notification to the user\'s inbox. Use this for important updates, completed tasks, reminders, warnings, or when you find something noteworthy during research or execution. The notification persists and the user can review it later.',
  inputSchema: z.object({
    title: z.string().describe('Short notification title (e.g. "Research Complete", "Task Failed", "Trending Topic Found")'),
    body: z.string().describe('Notification details — what happened, what was found, or what action is needed'),
    type: z.enum(['info', 'success', 'warning', 'task', 'reminder']).describe('Notification type: info (general), success (task done), warning (needs attention), task (action item), reminder (scheduled)'),
  }),
  execute: async ({ title, body, type }) => {
    if (!db) {
      return { sent: false, message: 'Database not configured — notification not persisted' };
    }

    try {
      const id = nanoid(12);
      await db.insert(notifications).values({
        id,
        userId: DEFAULT_USER_ID,
        title,
        body,
        type,
        source: 'agent',
        metadata: {},
      });

      return {
        sent: true,
        notificationId: id,
        message: `Notification sent: "${title}"`,
      };
    } catch (error) {
      console.error('[sendNotification]', error);
      return { sent: false, message: 'Failed to send notification' };
    }
  },
});
