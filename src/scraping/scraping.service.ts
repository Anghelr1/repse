import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { InjectRepository } from '@nestjs/typeorm';
import { ScrapingEntity } from './scraping.entity';
import { Repository } from 'typeorm';
const ac = require('@antiadmin/anticaptchaofficial');

@Injectable()
export class ScrapingService {
  constructor(
    @InjectRepository(ScrapingEntity)
    private scrapingRepository: Repository<ScrapingEntity>,
  ) {}

  private async handleCaptcha(page: puppeteer.Page) {
    await page.evaluate(() => {
      const recaptcha = document.querySelector('.grecaptcha-badge') as HTMLElement;
      if (recaptcha) {
        recaptcha.style.display = 'none';
      }
      const tokenInput = document.querySelector('#g-recaptcha-response') as HTMLInputElement;
      if (tokenInput) {
        tokenInput.value = 'dummy-token';
      }
    });
  }

  private async extractAndSaveData(page: puppeteer.Page) {
    const maxPageNumber = await page.evaluate(() => {
      const pageLinks = Array.from(document.querySelectorAll('.pagination .page-link[data-page]'));
      const pageNumbers = pageLinks.map(link => parseInt(link.getAttribute('data-page') || '0', 10));
      return Math.max(...pageNumbers);
    });

    console.log(`Max page number: ${maxPageNumber}`);

    let currentPage = 1;
    if (maxPageNumber <= 1) {
      await this.processPage(page);
      return;
    }

    while (currentPage <= maxPageNumber) {
      try {
        await this.processPage(page);
        if (currentPage < maxPageNumber) {
          console.log('Next page');
          await new Promise(resolve => setTimeout(resolve, 3000));
          try {
            await Promise.all([
              page.click(`.pagination .page-link[data-page="${currentPage + 1}"]`),
            ]);
            console.log('Navigated to next page');
            await new Promise(resolve => setTimeout(resolve, 5000));
            await this.handleCaptcha(page);
            await page.waitForSelector('#tablaem tr');
            currentPage++;
          } catch (error) {
            console.error(`Error navigating to next page: ${error.message}`);
            await this.reloadAndNavigateToPage(page, currentPage);
          }
        } else {
          console.log('No more pages');
          break;
        }
      } catch (error) {
        console.error(`Error processing page: ${error.message}`);
        await this.reloadAndNavigateToPage(page, currentPage);
      }
    }
  }

  private async reloadAndNavigateToPage(page: puppeteer.Page, currentPage: number) {
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('#rsoc');
    for (let i = 1; i < currentPage; i++) {
      await page.click(`.pagination .page-link[data-page="${i}"]`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      await page.waitForSelector('#tablaem tr');
      await this.handleCaptcha(page);
    }
  }

  private async processPage(page: puppeteer.Page) {
    await page.waitForSelector('#tablaem tr');
    await new Promise(resolve => setTimeout(resolve, 2000));
    const rows = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('#tablaem tr')).map(row => {
        return Array.from(row.querySelectorAll('th, td')).map(cell => cell.textContent?.trim() || '');
      });
    });

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length > 1) {
        const scrapingEntity = new ScrapingEntity();
        scrapingEntity.razonSocial = row[0];
        const numRegistro = parseInt(row[1], 10);
        scrapingEntity.numRegistro = isNaN(numRegistro) ? null : numRegistro;
        try {
          await this.scrapingRepository.save(scrapingEntity);
          console.log(`Saved: ${scrapingEntity.razonSocial}, ${scrapingEntity.numRegistro}`);
        } catch (error) {
          console.error(`Error saving entity: ${error.message}`);
        }
      }
    }
    await new Promise(resolve => setTimeout(resolve, 4000));
  }

  async scrapeData(url: string): Promise<any> {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    await page.click('#arrowdiv-consulta');
    await page.waitForSelector('.btn-primary-right');
    await page.evaluate(() => {
      const button = document.querySelector('.btn-primary-right');
      if (button) {
        button.scrollIntoView();
      }
    });
    try {
      await page.click('.btn-primary-right');
    } catch (error) {
      console.error(`Error clicking .btn-primary-right: ${error.message}`);
      await browser.close();
      return;
    }

    await page.waitForSelector('#rsoc');
    console.log('Página redireccionada');

    const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
      'k', 'l', 'm', 'n', 'ñ', 'o', 'p', 'q', 'r', 's', 't',
      'u', 'v', 'w', 'x', 'y', 'z'];
    for (let i = 0; i < letters.length; i++) {
      for (let j = 0; j < letters.length; j++) {
        for (let k = 0; k < letters.length; k++) {
          let searchString = `${letters[i]}${letters[j]}${letters[k]}`;
          let retry = true;

          while (retry) {
            await page.type('#rsoc', searchString);
            await new Promise(resolve => setTimeout(resolve, 3000));

            await this.handleCaptcha(page); // Handle captcha before search

            await page.click('#bnt_busqueda');
            await page.waitForSelector('#tablaem');
            await new Promise(resolve => setTimeout(resolve, 2000));
            console.log(`Searching for: ${searchString}`);

            const captchaError = await page.evaluate(() => {
              const errorElement = document.querySelector('#tablaem tbody h4');
              return errorElement ? errorElement.textContent.includes('Validación de capcha incorrecta.') : false;
            });

            if (captchaError) {
              console.log('Captcha validation failed, refreshing page...');
              await page.reload({ waitUntil: 'networkidle2' });
              await page.waitForSelector('#rsoc');
              continue;
            }

            retry = false;

            await this.extractAndSaveData(page);
            await page.evaluate(() => (document.querySelector('#rsoc') as HTMLInputElement).value = '');
          }
        }
      }
    }
    await browser.close();
  }
}