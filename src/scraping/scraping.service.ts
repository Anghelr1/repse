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
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Hacer clic en los botones específicos
    await page.click('#arrowdiv-consulta');
    await page.waitForSelector('.btn-primary-right ');
    await page.click('.btn-primary-right ');

    // Esperar a que la página se redireccione
    await page.waitForSelector('#rsoc');
    console.log('Página redireccionada');

    let letters = ['a', 'b'];
    for (let i = 0; i < letters.length; i++) {
      for (let j = 0; j < letters.length; j++) {
        for (let k = 0; k < letters.length; k++) {
          await page.type('#rsoc', `${letters[i]}${letters[j]}${letters[k]}`);
          await page.click('#bnt_busqueda');
          await page.waitForSelector('#tablaem');
          await page.waitForSelector('th'); // Esperar a que aparezca la etiqueta td
          console.log(`${letters[i]}${letters[j]}${letters[k]}`);
          await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000))); // Esperar 2 segundos

          // Obtener los datos arrojados
          const rows = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('#tablaem tr')).map(
              (row) => {
                return Array.from(row.querySelectorAll('th, td')).map(
                  (cell) => cell.textContent?.trim() || '',
                );
              },
            );
          });
          console.log('.5');

          // Guardar los datos en la base de datos
          for (let i = 1; i < rows.length; i++) {
            console.log(rows[i]);
            console.log('1');
            const row = rows[i];
            if (row.length > 1) {
              console.log('2');
              const numRegistro = parseInt(row[1], 10);
              if (!isNaN(numRegistro)) {
                console.log('3');
                const scrapingEntity = new ScrapingEntity();
                scrapingEntity.razonSocial = row[0]; // Asignar el valor correspondiente
                scrapingEntity.numRegistro = numRegistro; // Asignar el valor correspondiente
                console.log(
                  `Guardando: ${scrapingEntity.razonSocial}, ${scrapingEntity.numRegistro}`,
                );
                await this.scrapingRepository.save(scrapingEntity);
              } else {
                console.warn(`Número de registro no válido: ${row[1]}`);
              }
            }
          }
          await page.evaluate(
            () =>
              ((document.querySelector('#rsoc') as HTMLInputElement).value =
                ''),
          );
        }
      }
    }
    await browser.close();
  }
}

//          const data = await page.evaluate(() => {
//             return document.querySelector("#resultData").textContent;

/*
tables: Array.from(document.querySelectorAll('table')).map((table, index) => {
                    const rows = Array.from(table.querySelectorAll('tr')).map(row => {
                        return Array.from(row.querySelectorAll('th, td')).map(cell => cell.textContent?.trim() || '');
                    });
                    // Filter out tables with rows of length 2
                    if (rows.length > 1 && rows[0].length > 1 && !rows.some(row => row.length === 2)) {
                        return {
                            name: `${title}_${index + 1}`,
                            rows: rows
                        };
                    }
                    return null;
                }).filter(table => table !== null)
* */
/*
for (const row of rows) {
            const scrapingEntity = new ScrapingEntity();
            scrapingEntity.razonSocial = row[0]; // Asignar el valor correspondiente
            scrapingEntity.numRegistro = parseInt(row[1], 10); // Asignar el valor correspondiente
            await this.scrapingRepository.save(scrapingEntity);
          }
 */
