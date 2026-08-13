import { Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { NewsService } from '../news/news.service';

@Injectable()
export class McpService {
  constructor(private readonly newsService: NewsService) {}

  createServer(): McpServer {
    const server = new McpServer({
      name: 'BenzosTracker MCP',
      version: '1.0.0',
    });

    server.registerTool(
      'create_news_item',
      {
        description: 'Create a curated news item in the News database.',
        inputSchema: z.object({
          feedCode: z.string(),
          titleHe: z.string(),
          originalTitle: z.string().optional(),
          summaryHe: z.string(),
          sourceName: z.string(),
          sourceUrl: z.string().url(),
          category: z.string().optional(),
          location: z.string().optional(),
          companyTopic: z.string().optional(),
          importanceScore: z.number().int().min(1).max(5).optional(),
          personalScore: z.number().int().min(1).max(5).optional(),
          isFeatured: z.boolean().optional(),
          displayWeekStart: z.string(),
          publishedAt: z.string().optional(),
          topicCodes: z.array(z.string()).optional(),
        })
      },
      async (args) => {
        try {
          const item = await this.newsService.create(args as any);
          return {
            content: [
              {
                type: 'text',
                text: `Successfully created news item with ID: ${item.id}`,
              },
            ],
          };
        } catch (error: any) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Error creating news item: ${error?.message || 'Unknown error'}`,
              },
            ],
          };
        }
      }
    );

    return server;
  }
}
