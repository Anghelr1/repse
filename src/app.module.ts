import { Module } from "@nestjs/common";
import { ScrapingService } from "./scraping/scraping.service";
import { ScrapingController } from "./scraping/scraping.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScrapingEntity } from "./scraping/scraping.entity";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "mysql",
      host: "localhost",
      port: 3306,
      username: "root",
      password: "rA&Jc5Xf9d!h!YSK",
      database: "scraping",
      entities: [ScrapingEntity],
      synchronize: true
    }),
    TypeOrmModule.forFeature([ScrapingEntity])
  ],
  controllers: [ScrapingController],
  providers: [ScrapingService]
})
export class AppModule {
}
