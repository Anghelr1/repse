import { Controller, Get, Query, Version } from '@nestjs/common';
import { ScrapingService } from './scraping.service';
import { ScrapingEntity } from './scraping.entity';
@Controller({
  path: 'repse',
  version: '1',
})

export class ScrapingController {
  constructor(private readonly scrapingService: ScrapingService) {}

  @Get()
  async scrape(@Query('url') url: string): Promise<ScrapingEntity> {
    return this.scrapingService.scrapeData(url);
  }
}