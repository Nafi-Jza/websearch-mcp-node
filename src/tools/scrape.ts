import { getBrowserContext } from '../browser.js';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import { logActivity, saveOutput } from '../utils/logger.js';

export async function scrapePage(url: string): Promise<string> {
    const context = await getBrowserContext(true);
    const page = await context.newPage();

    try {
        logActivity('scrape', `Scraping URL: ${url}`);

        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        });

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(3000);

        const html = await page.content();
        let finalMarkdown = '';

        if (html.includes('cf-browser-verification') || html.includes('cf-turnstile') || html.length < 500) {
            logActivity('scrape-warning', "Possible Cloudflare challenge, fallback to innerText");
            const innerText = await page.evaluate(() => document.body.innerText);
            finalMarkdown = `# Scraped Text (Fallback)\n\n${innerText}`;
        } else {
            const dom = new JSDOM(html, { url });
            const reader = new Readability(dom.window.document);
            const article = reader.parse();

            if (!article || !article.content) {
                logActivity('scrape-warning', "Readability failed, fallback to innerText");
                const innerText = await page.evaluate(() => document.body.innerText);
                finalMarkdown = `# Scraped Text (Fallback)\n\n${innerText}`;
            } else {
                const turndownService = new TurndownService({
                    headingStyle: 'atx',
                    codeBlockStyle: 'fenced'
                });
                const markdownContent = turndownService.turndown(article.content);
                const title = article.title || 'Scraped Content';
                finalMarkdown = `# ${title}\n\n**Source:** ${url}\n\n${markdownContent}`;
            }
        }

        logActivity('scrape-success', `Extracted length: ${finalMarkdown.length}`);
        saveOutput('scrape', finalMarkdown);
        return finalMarkdown;
    } catch (error) {
        logActivity('scrape-error', `Failed: ${(error as Error).message}`);
        return `Error scraping ${url}: ${(error as Error).message}`;
    } finally {
        logActivity('scrape', 'Closing scrape tab.');
        await page.close().catch(() => {});
    }
}
