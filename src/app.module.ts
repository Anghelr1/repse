import { Module } from "@nestjs/common";
import { ScrapingService } from "./scraping/scraping.service";
import { ScrapingController } from "./scraping/scraping.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScrapingEntity } from "./scraping/scraping.entity";
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'mssql',
      host: process.env.DB_HOSTNAME,
      port: +process.env.DB_PORT,
      database: process.env.DB_NAME,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      extra: {
        options: {
          encrypt: false,
          trustServerCertificate: true,
        },
      },
      autoLoadEntities: true,
      synchronize: true,
    }),
    TypeOrmModule.forFeature([ScrapingEntity])
  ],
  controllers: [ScrapingController],
  providers: [ScrapingService]
})
export class AppModule {}