import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/db';
import { knowledgeBases, knowledgeDocuments } from '@/db/schema';
import { eq, sql, ilike } from 'drizzle-orm';

/**
 * Search the user's knowledge bases for relevant information.
 * Performs keyword matching against stored document content.
 */
export const searchKnowledge = tool({
  description: 'Search the user\'s uploaded knowledge bases for relevant information. Use this when the user asks about their documents, notes, or uploaded content. Searches across all knowledge bases by keyword.',
  inputSchema: z.object({
    query: z.string().describe('Keywords to search for in knowledge base documents'),
    kbName: z.string().optional().describe('Optional: limit search to a specific knowledge base by name'),
  }),
  execute: async ({ query, kbName }) => {
    if (!db) {
      return { results: [], message: 'Database not configured' };
    }

    try {
      // Build search query - search in document content
      const searchTerm = `%${query}%`;
      
      let results;
      if (kbName) {
        // Search within a specific KB
        results = await db
          .select({
            docId: knowledgeDocuments.id,
            docName: knowledgeDocuments.name,
            docType: knowledgeDocuments.type,
            content: knowledgeDocuments.content,
            kbName: knowledgeBases.name,
          })
          .from(knowledgeDocuments)
          .innerJoin(knowledgeBases, eq(knowledgeDocuments.kbId, knowledgeBases.id))
          .where(sql`${knowledgeDocuments.content} ILIKE ${searchTerm} AND ${knowledgeBases.name} ILIKE ${'%' + kbName + '%'}`)
          .limit(5);
      } else {
        // Search all KBs
        results = await db
          .select({
            docId: knowledgeDocuments.id,
            docName: knowledgeDocuments.name,
            docType: knowledgeDocuments.type,
            content: knowledgeDocuments.content,
            kbName: knowledgeBases.name,
          })
          .from(knowledgeDocuments)
          .innerJoin(knowledgeBases, eq(knowledgeDocuments.kbId, knowledgeBases.id))
          .where(sql`${knowledgeDocuments.content} ILIKE ${searchTerm}`)
          .limit(5);
      }

      // Return snippets around the match
      const snippets = results.map(r => {
        const content = r.content || '';
        const lowerContent = content.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const idx = lowerContent.indexOf(lowerQuery);
        const start = Math.max(0, idx - 200);
        const end = Math.min(content.length, idx + query.length + 200);
        const snippet = (start > 0 ? '...' : '') + content.slice(start, end) + (end < content.length ? '...' : '');

        return {
          documentName: r.docName,
          knowledgeBase: r.kbName,
          type: r.docType,
          snippet: snippet.slice(0, 500),
        };
      });

      return {
        results: snippets,
        totalFound: snippets.length,
        message: snippets.length > 0
          ? `Found ${snippets.length} result(s) for "${query}"`
          : `No results found for "${query}" in knowledge bases`,
      };
    } catch (error) {
      console.error('[searchKnowledge]', error);
      return { results: [], message: 'Search failed' };
    }
  },
});
