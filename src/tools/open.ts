import { getBrowserContext } from '../browser.js';
import { logActivity } from '../utils/logger.js';

export async function openBrowser(url?: string): Promise<string> {
    logActivity('open_browser', "Opening headed browser for manual interaction...");

    // Ensure any existing context is usable, then open URL in new tab
    const context = await getBrowserContext(true);
    const page = await context.newPage();

    if (url && url.trim() !== '') {
        logActivity('open_browser', `Navigating to ${url}`);
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded' });
        } catch (e) {
            logActivity('open_browser-error', `Failed to navigate: ${(e as Error).message}`);
        }
    }

    logActivity('open_browser', "Waiting for user to close browser...");

    return new Promise((resolve) => {
        context.on('close', () => {
            logActivity('open_browser', "User closed browser.");
            resolve("Browser session closed. Profile updated successfully.");
        });
    });
}
