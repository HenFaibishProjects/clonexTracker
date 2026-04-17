import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { firstValueFrom, timeout } from 'rxjs';

import { AiStatusCheck } from './entities/ai-status-check.entity';

// ─── Response Types ────────────────────────────────────────────────────────────

/** Standard Atlassian Statuspage v2 response. */
interface StatuspageResponse {
  status: {
    indicator: 'none' | 'minor' | 'major' | 'critical';
    description: string;
  };
}

/** A single entry from Google Cloud's incidents.json feed. */
interface GoogleIncident {
  end: string | null;
  severity: string;
  affected_products: Array<{ title: string }>;
  external_desc: string;
}

// ─── Provider Registry ────────────────────────────────────────────────────────

/**
 * Response format variants:
 *
 *  statuspage    – Atlassian Statuspage v2 JSON (OpenAI, Anthropic, Mistral, Groq, etc.)
 *  google-incidents – Google Cloud incidents.json (Gemini)
 *  xai-rss       – xAI RSS/Atom feed (only machine-readable endpoint that works)
 *  unsupported   – Provider has no reliable public machine-readable endpoint
 */
type ResponseFormat = 'statuspage' | 'google-incidents' | 'xai-rss' | 'unsupported';

interface ProviderEndpoint {
  /** Stored in DB — must fit column length: 50. */
  name: string;
  url: string;
  format: ResponseFormat;
  /** Human-readable note explaining why a provider is unsupported. */
  unsupportedReason?: string;
}

const PROVIDERS: ProviderEndpoint[] = [
  // ── Working providers (unchanged) ───────────────────────────────────────────
  {
    name: 'openai',
    url: 'https://status.openai.com/api/v2/status.json',
    format: 'statuspage',
  },
  {
    name: 'anthropic',
    url: 'https://status.anthropic.com/api/v2/status.json',
    format: 'statuspage',
  },
  {
    name: 'gemini',
    url: 'https://status.cloud.google.com/incidents.json',
    format: 'google-incidents',
  },
  {
    name: 'deepseek',
    url: 'https://status.deepseek.com/api/v2/status.json',
    format: 'statuspage',
  },

  // ── Fixed providers ──────────────────────────────────────────────────────────
  {
    // xAI's status.x.ai returns 403 on all HTTP paths.
    // The RSS/Atom feed at /feed.xml is publicly accessible and machine-readable.
    name: 'xai',
    url: 'https://status.x.ai/feed.xml',
    format: 'xai-rss',
  },

  // ── Providers without a usable public machine-readable API ───────────────────
  {
    // status.mistral.ai is powered by Checkly, which does not expose a public
    // unauthenticated JSON endpoint. The /api/v2/status.json path returns 404.
    name: 'mistral',
    url: '',
    format: 'unsupported',
    unsupportedReason:
      'Mistral status page (Checkly) does not expose a public machine-readable API.',
  },
  {
    // status.groq.com is a fully custom React-rendered HTML page.
    // No JSON or Atom endpoint is available without authentication.
    name: 'groq',
    url: '',
    format: 'unsupported',
    unsupportedReason:
      'Groq status page does not expose a public machine-readable API.',
  },
  {
    // status.perplexity.ai uses Instatus. The authenticated REST API
    // (https://api.instatus.com) requires an API key; no unauthenticated
    // JSON endpoint is publicly accessible.
    name: 'perplexity',
    url: '',
    format: 'unsupported',
    unsupportedReason:
      'Perplexity status page (Instatus) requires an API key — no public endpoint available.',
  },
];

// Keywords used to filter Google incidents for AI-related services
const GOOGLE_AI_KEYWORDS = [
  'gemini',
  'vertex',
  'generative ai',
  'model garden',
  'cloud ai',
];

type StatusLabel = 'operational' | 'degraded' | 'outage' | 'unreachable' | 'error' | 'unsupported';

/** Shape of a single day's aggregated data returned by getHistory(). */
export interface DailyProviderStatus {
  date: string;           // "YYYY-MM-DD" (UTC)
  status: StatusLabel;
  avg_latency: number | null;
  checks: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class AiStatusService {
  private readonly logger = new Logger(AiStatusService.name);

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(AiStatusCheck)
    private readonly repo: Repository<AiStatusCheck>,
  ) {}

  // ─── Public API ─────────────────────────────────────────────────────────────

  /** Called by the scheduler. Checks all providers concurrently and persists results. */
  async checkAndStoreAll(): Promise<void> {
    this.logger.log(`Running AI status check for ${PROVIDERS.length} provider(s)…`);

    const results = await Promise.allSettled(
      PROVIDERS.map((p) => this.checkAndStore(p)),
    );

    for (const [i, result] of results.entries()) {
      if (result.status === 'rejected') {
        this.logger.error(
          `Unexpected failure while checking "${PROVIDERS[i].name}": ${result.reason}`,
        );
      }
    }
  }

  /** Returns the most-recent record for every tracked provider. */
  async getLatest(): Promise<AiStatusCheck[]> {
    const records = await Promise.all(
      PROVIDERS.map(({ name }) =>
        this.repo.findOne({
          where: { provider: name },
          order: { checked_at: 'DESC' },
        }),
      ),
    );

    return records.filter((r): r is AiStatusCheck => r !== null);
  }

  /**
   * Returns daily-aggregated history grouped by provider.
   *
   * Shape:
   * {
   *   "openai": [
   *     { "date": "2026-04-17", "status": "operational", "avg_latency": 295, "checks": 4 }
   *   ],
   *   ...
   * }
   *
   * Day status priority (highest wins):
   *   outage > degraded > operational > unsupported > error
   */
  async getHistory(days = 30): Promise<Record<string, DailyProviderStatus[]>> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await this.repo.find({
      where: { checked_at: MoreThanOrEqual(since) },
      order: { checked_at: 'ASC' },
    });

    // ── Group rows by provider → UTC date ────────────────────────────────────
    const buckets = new Map<string, Map<string, AiStatusCheck[]>>();

    for (const row of rows) {
      const provider = row.provider ?? 'unknown';
      const date = this.toUtcDateString(row.checked_at ?? new Date());

      if (!buckets.has(provider)) buckets.set(provider, new Map());
      const days = buckets.get(provider)!;
      if (!days.has(date)) days.set(date, []);
      days.get(date)!.push(row);
    }

    // ── Aggregate each (provider, day) bucket ────────────────────────────────
    const result: Record<string, DailyProviderStatus[]> = {};

    for (const [provider, dayMap] of buckets) {
      result[provider] = [];

      // Iterate in insertion order (rows were fetched ASC, so dates are oldest→newest)
      for (const [date, checkRows] of dayMap) {
        const status = this.aggregateDayStatus(checkRows.map((r) => r.status ?? 'error'));

        const latencies = checkRows
          .map((r) => r.latency_ms)
          .filter((l): l is number => l !== null && l !== undefined);

        const avg_latency =
          status === 'unsupported' || latencies.length === 0
            ? null
            : Math.round(latencies.reduce((sum, l) => sum + l, 0) / latencies.length);

        result[provider].push({
          date,
          status,
          avg_latency,
          checks: checkRows.length,
        });
      }
    }

    return result;
  }

  /**
   * Converts a Date to a UTC date string in "YYYY-MM-DD" format.
   * Using UTC ensures consistency regardless of the server's local timezone.
   */
  private toUtcDateString(date: Date): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Determines the representative status for a single day's worth of checks.
   *
   * Priority (highest wins):
   *   outage > degraded > operational > unsupported > error
   */
  private aggregateDayStatus(statuses: string[]): StatusLabel {
    const PRIORITY: StatusLabel[] = [
      'outage',
      'degraded',
      'operational',
      'unsupported',
      'error',
    ];

    for (const candidate of PRIORITY) {
      if (statuses.includes(candidate)) return candidate;
    }

    return 'error';
  }

  // ─── Core Check ─────────────────────────────────────────────────────────────

  private async checkAndStore(provider: ProviderEndpoint): Promise<void> {
    // Fast-path: persist unsupported providers immediately without an HTTP call.
    if (provider.format === 'unsupported') {
      const record = this.repo.create({
        provider: provider.name,
        status: 'unsupported',
        latency_ms: null,
        description: (provider.unsupportedReason ?? 'No public status API available.').substring(0, 300),
      });
      await this.repo.save(record);
      this.logger.log(`[${provider.name}] saved — status=unsupported (no public API)`);
      return;
    }

    const startMs = Date.now();
    let status: StatusLabel = 'error';
    let description = '';
    let latency: number | null = null;

    try {
      const response = await firstValueFrom(
        this.httpService
          .get<unknown>(provider.url, { headers: { Accept: '*/*' } })
          .pipe(timeout(10_000)),
      );

      latency = Date.now() - startMs;

      let parsed: { status: StatusLabel; description: string };

      switch (provider.format) {
        case 'google-incidents':
          parsed = this.parseGoogleIncidents(response.data);
          break;
        case 'xai-rss':
          parsed = this.parseXaiRss(response.data);
          break;
        default:
          parsed = this.parseStatuspage(response.data);
      }

      status = parsed.status;
      description = parsed.description;
    } catch (err: unknown) {
      latency = Date.now() - startMs;

      if (this.isNetworkOrTimeoutError(err)) {
        status = 'unreachable';
        description = 'Provider could not be reached within the timeout window.';
      } else {
        status = 'error';
        description =
          err instanceof Error ? err.message : 'Unknown error during status fetch.';
      }

      this.logger.warn(`[${provider.name}] ${status}: ${description}`);
    }

    const record = this.repo.create({
      provider: provider.name,
      status,
      latency_ms: latency,
      description: description.substring(0, 300),
    });

    await this.repo.save(record);
    this.logger.log(
      `[${provider.name}] saved — status=${status}, latency=${latency ?? '?'}ms`,
    );
  }

  // ─── Parsers ─────────────────────────────────────────────────────────────────

  /**
   * Atlassian Statuspage v2 JSON.
   *
   *  indicator  →  our label
   *  ─────────────────────────
   *  none       →  operational
   *  minor      →  degraded
   *  major      →  outage
   *  critical   →  outage
   */
  private parseStatuspage(data: unknown): { status: StatusLabel; description: string } {
    const body = data as StatuspageResponse;
    const indicator = body?.status?.indicator;
    const description = body?.status?.description ?? '';

    let status: StatusLabel;
    switch (indicator) {
      case 'none':
        status = 'operational';
        break;
      case 'minor':
        status = 'degraded';
        break;
      case 'major':
      case 'critical':
        status = 'outage';
        break;
      default:
        status = 'error';
    }

    return { status, description };
  }

  /**
   * Google Cloud incidents.json — filters for AI-related services.
   *
   *  no active AI incidents       →  operational
   *  active + severity == high    →  outage
   *  active + other severity      →  degraded
   */
  private parseGoogleIncidents(data: unknown): { status: StatusLabel; description: string } {
    if (!Array.isArray(data)) {
      return { status: 'error', description: 'Unexpected response format from Google.' };
    }

    const incidents = data as GoogleIncident[];

    const activeAiIncidents = incidents.filter((incident) => {
      if (incident.end !== null) return false;

      const searchText = [
        incident.external_desc ?? '',
        ...(incident.affected_products ?? []).map((p) => p.title ?? ''),
      ]
        .join(' ')
        .toLowerCase();

      return GOOGLE_AI_KEYWORDS.some((kw) => searchText.includes(kw));
    });

    if (activeAiIncidents.length === 0) {
      return { status: 'operational', description: 'All Gemini / AI systems operational.' };
    }

    const hasHighSeverity = activeAiIncidents.some(
      (i) => i.severity?.toLowerCase() === 'high',
    );

    const summary = activeAiIncidents
      .map((i) => i.external_desc)
      .filter(Boolean)
      .join(' | ');

    return {
      status: hasHighSeverity ? 'outage' : 'degraded',
      description: summary || 'Active AI-related incident detected.',
    };
  }

  /**
   * xAI RSS/Atom feed at https://status.x.ai/feed.xml.
   *
   * The feed contains one entry per incident. Each entry carries a "severity"
   * field injected into the description. A "Resolved" timestamp in an entry
   * means the incident is closed.
   *
   * Strategy:
   *  – Parse raw XML text looking for <entry> blocks that lack a "Resolved:" line
   *    (i.e. still open).
   *  – If any open entries reference a critical/outage severity → outage.
   *  – If open entries exist otherwise → degraded.
   *  – No open entries → operational.
   */
  private parseXaiRss(data: unknown): { status: StatusLabel; description: string } {
    const xml = typeof data === 'string' ? data : '';

    if (!xml) {
      return { status: 'error', description: 'Empty or non-text response from xAI feed.' };
    }

    // Split into individual <entry> or <item> blocks
    const entryPattern = /<(?:entry|item)[\s\S]*?<\/(?:entry|item)>/gi;
    const entries = xml.match(entryPattern) ?? [];

    if (entries.length === 0) {
      // Feed is reachable but has no incidents at all — treat as operational
      return { status: 'operational', description: 'All xAI services operational.' };
    }

    const stripTags = (s: string) => s.replace(/<[^>]+>/g, '').trim();

    const openIncidents: Array<{ title: string; severity: string }> = [];

    for (const entry of entries) {
      // Check for a resolved timestamp anywhere inside the block
      const isResolved = /\bResolved\b/i.test(entry);
      if (isResolved) continue;

      // Extract title
      const titleMatch = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? stripTags(titleMatch[1]) : 'Unknown incident';

      // Extract severity from the description/summary block
      const severityMatch = entry.match(/Severity:\s*(\w+)/i);
      const severity = severityMatch ? severityMatch[1].toLowerCase() : 'unknown';

      openIncidents.push({ title, severity });
    }

    if (openIncidents.length === 0) {
      return { status: 'operational', description: 'All xAI services operational.' };
    }

    const criticalSeverities = ['critical', 'outage', 'major', 'high'];
    const hasCritical = openIncidents.some((i) =>
      criticalSeverities.includes(i.severity),
    );

    const summary = openIncidents.map((i) => i.title).join(' | ');

    return {
      status: hasCritical ? 'outage' : 'degraded',
      description: summary,
    };
  }

  // ─── Utilities ────────────────────────────────────────────────────────────────

  /** True for errors where the remote host was simply unreachable or timed out. */
  private isNetworkOrTimeoutError(err: unknown): boolean {
    if (!(err instanceof Error)) return false;

    const msg = err.message.toLowerCase();
    const keywords = [
      'timeout',
      'econnrefused',
      'enotfound',
      'econnreset',
      'socket hang up',
      'network error',
      'etimedout',
    ];

    return keywords.some((kw) => msg.includes(kw));
  }
}