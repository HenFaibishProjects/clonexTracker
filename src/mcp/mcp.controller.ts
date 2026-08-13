import { Controller, All, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { McpService } from './mcp.service';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'crypto';

@Controller('mcp')
export class McpController {
  private transports = new Map<string, StreamableHTTPServerTransport>();

  constructor(private readonly mcpService: McpService) {}

  @All()
  async handleMcp(@Req() req: Request, @Res() res: Response) {
    const sessionId = (req.headers['mcp-session-id'] as string) || (req.query.sessionId as string);
    let transport: StreamableHTTPServerTransport;

    if (sessionId && this.transports.has(sessionId)) {
      transport = this.transports.get(sessionId)!;
    } else {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });
      const server = this.mcpService.createServer();
      server.connect(transport).catch((err) => {
        console.error('Failed to connect MCP server to transport', err);
      });
    }

    try {
      await transport.handleRequest(req, res, req.body);
      
      if (transport.sessionId && !this.transports.has(transport.sessionId)) {
        this.transports.set(transport.sessionId, transport);
        
        // Optional: clean up on close
        const originalClose = transport.close.bind(transport);
        transport.close = async () => {
          this.transports.delete(transport.sessionId!);
          return originalClose();
        };
      }
    } catch (err) {
      console.error('Error handling MCP request:', err);
      if (!res.headersSent) {
        res.status(500).send('Internal Server Error');
      }
    }
  }
}
