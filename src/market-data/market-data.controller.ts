import { Controller, Get } from '@nestjs/common';
import { MarketDataService } from './market-data.service';

@Controller('market-summary')
export class MarketDataController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get()
  getMarketSummary() {
    return this.marketDataService.getSummary();
  }
}
