import { Controller, Get, Query } from '@nestjs/common';
import { ScrapingService } from './scraping.service';
import { ScrapingEntity } from './scraping.entity';

@Controller('scraping')
export class ScrapingController {
  constructor(private readonly scrapingService: ScrapingService) {}

  @Get()
  async scrape(@Query('url') url: string): Promise<ScrapingEntity> {
    return this.scrapingService.scrapeData(url);
  }
}