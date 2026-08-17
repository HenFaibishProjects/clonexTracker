import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

type StockSummary = {
  symbol: string;
  name: string;
  currency: string;
  price: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
  asOf?: string;
};

type FxRate = {
  code: 'USD' | 'EUR' | 'RON';
  ilsRate: number;
  date?: string;
};

type MarketSummary = {
  stock: StockSummary | null;
  fx: FxRate[];
  updatedAt: string;
};

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);
  private readonly cacheTtlMs = 5 * 60 * 1000;
  private cache: { expiresAt: number; value: MarketSummary } | null = null;

  async getSummary(): Promise<MarketSummary> {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.value;
    }

    const [stockResult, fxResult] = await Promise.allSettled([
      this.getZoomInfoStock(),
      this.getFxRates(),
    ]);

    if (stockResult.status === 'rejected') {
      this.logger.warn(`ZoomInfo stock lookup failed: ${stockResult.reason?.message || stockResult.reason}`);
    }
    if (fxResult.status === 'rejected') {
      this.logger.warn(`FX lookup failed: ${fxResult.reason?.message || fxResult.reason}`);
    }

    const value: MarketSummary = {
      stock: stockResult.status === 'fulfilled' ? stockResult.value : null,
      fx: fxResult.status === 'fulfilled' ? fxResult.value : [],
      updatedAt: new Date().toISOString(),
    };

    this.cache = {
      expiresAt: Date.now() + this.cacheTtlMs,
      value,
    };

    return value;
  }

  private async getZoomInfoStock(): Promise<StockSummary> {
    const response = await axios.get(
      'https://query1.finance.yahoo.com/v8/finance/chart/GTM',
      {
        params: {
          interval: '1m',
          range: '1d',
        },
        headers: {
          'User-Agent': 'Mozilla/5.0',
          Accept: 'application/json',
        },
        timeout: 8000,
      },
    );

    const meta = response.data?.chart?.result?.[0]?.meta;
    const price = Number(meta?.regularMarketPrice);
    if (!Number.isFinite(price)) {
      throw new Error('Yahoo Finance response did not include a valid GTM price');
    }

    const previousCloseRaw = meta?.chartPreviousClose ?? meta?.previousClose;
    const previousClose = Number(previousCloseRaw);
    const hasPreviousClose = Number.isFinite(previousClose);
    const change = hasPreviousClose ? price - previousClose : undefined;
    const changePercent = hasPreviousClose && previousClose !== 0
      ? (change! / previousClose) * 100
      : undefined;

    return {
      symbol: 'GTM',
      name: 'ZoomInfo Technologies',
      currency: meta?.currency || 'USD',
      price,
      previousClose: hasPreviousClose ? previousClose : undefined,
      change,
      changePercent,
      asOf: meta?.regularMarketTime
        ? new Date(Number(meta.regularMarketTime) * 1000).toISOString()
        : undefined,
    };
  }

  private async getFxRates(): Promise<FxRate[]> {
    const codes: Array<'USD' | 'EUR' | 'RON'> = ['USD', 'EUR', 'RON'];

    return Promise.all(
      codes.map(async (code) => {
        const response = await axios.get(
          `https://api.frankfurter.dev/v2/rate/${code}/ILS`,
          { timeout: 8000 },
        );

        const rate = Number(response.data?.rate);
        if (!Number.isFinite(rate)) {
          throw new Error(`Invalid ${code}/ILS rate`);
        }

        return {
          code,
          ilsRate: rate,
          date: response.data?.date,
        };
      }),
    );
  }
}
