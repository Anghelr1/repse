import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { InjectRepository } from '@nestjs/typeorm';
import { ScrapingEntity } from './scraping.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ScrapingService {
  constructor(
    @InjectRepository(ScrapingEntity)
    private scrapingRepository: Repository<ScrapingEntity>,
  ) {}

  async scrapeData(url: string): Promise<any> {
    const browser = await puppeteer.launch({ headless: false }); // Set headless to false for debugging
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Click on specific buttons
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

    // Wait for the page to redirect
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
            await new Promise(resolve => setTimeout(resolve, 4000));

            // Disable reCAPTCHA
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

            await page.click('#bnt_busqueda');
            await page.waitForSelector('#tablaem');
            await new Promise(resolve => setTimeout(resolve, 2000));
            console.log(`Searching for: ${searchString}`);

            // Check for reCAPTCHA validation error
            const captchaError = await page.evaluate(() => {
              const errorElement = document.querySelector('#tablaem tbody h4');
              return errorElement ? errorElement.textContent.includes('Validación de capcha incorrecta.') : false;
            });

            if (captchaError) {
              console.log('Captcha validation failed, refreshing page...');
              await page.reload({ waitUntil: 'networkidle2' });
              await page.waitForSelector('#rsoc');
              continue; // Retry the same search string
            }

            retry = false; // Exit the retry loop if no captcha error

            await page.waitForSelector('#tablaem tr');
            // Extract data from the table
            const rows = await page.evaluate(() => {
              return Array.from(document.querySelectorAll('#tablaem tr')).map(row => {
                return Array.from(row.querySelectorAll('th, td')).map(cell => cell.textContent?.trim() || '');
              });
            });

            // Skip the header row and save data to the database
            for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              if (row.length > 1) {
                const scrapingEntity = new ScrapingEntity();
                scrapingEntity.razonSocial = row[0]; // Assign the corresponding value
                // Ensure row[1] is a valid number
                const numRegistro = parseInt(row[1], 10);
                scrapingEntity.numRegistro = isNaN(numRegistro) ? null : numRegistro; // Assign the corresponding value or null if not a valid number
                console.log(`Saving: ${scrapingEntity.razonSocial}, ${scrapingEntity.numRegistro}`);
                try {
                  await this.scrapingRepository.save(scrapingEntity);
                  console.log(`Saved: ${scrapingEntity.razonSocial}, ${scrapingEntity.numRegistro}`);
                } catch (error) {
                  console.error(`Error saving entity: ${error.message}`);
                }
              }
            }
            await page.evaluate(() => (document.querySelector('#rsoc') as HTMLInputElement).value = '');
          }
        }
      }
    }
    await browser.close();
  }
}
