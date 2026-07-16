import { chromium, BrowserContext } from 'playwright';
import path from 'path';
import { logActivity } from './utils/logger.js';

export const PROFILE_DIR = path.join(process.cwd(), 'browser-profile');
export const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

let browserContext: BrowserContext | null = null;
let browserLaunchPromise: Promise<BrowserContext> | null = null;

export async function getBrowserContext(headed: boolean = true): Promise<BrowserContext> {
    // Self-healing: if context exists but is dead, reset
    if (browserContext) {
        try {
            browserContext.pages();
            return browserContext;
        } catch (e) {
            logActivity('browser-warning', 'Existing context dead, resetting...');
            browserContext = null;
        }
    }

    // If a launch is already in progress (concurrent calls), wait for it
    if (browserLaunchPromise) {
        logActivity('browser', 'Launch already in progress, waiting...');
        return browserLaunchPromise;
    }

    browserLaunchPromise = (async () => {
        logActivity('browser', `Launching persistent context... (Headed: ${headed}) Using Playwright Chromium | Profile: ${PROFILE_DIR}`);

        const launchOptions: any = {
            headless: !headed,
            viewport: { width: 1280, height: 720 },
            userAgent: USER_AGENT,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--disable-infobars',
                '--window-position=0,0',
                '--ignore-certificate-errors',
                '--ignore-certificate-errors-spki-list',
            ]
        };

        try {
            const ctx = await chromium.launchPersistentContext(PROFILE_DIR, launchOptions);
            browserContext = ctx;
            logActivity('browser', "Browser context launched successfully.");

            ctx.on('close', () => {
                logActivity('browser', "Browser context closed by user/OS.");
                browserContext = null;
                browserLaunchPromise = null;
            });

            return ctx;
        } catch (error) {
            logActivity('browser-error', `Failed to launch: ${(error as Error).message}`);
            browserLaunchPromise = null;
            throw new Error(`Failed to launch browser: ${(error as Error).message}`);
        } finally {
            browserLaunchPromise = null;
        }
    })();

    return browserLaunchPromise;
}

export async function closeBrowserContext(): Promise<void> {
    if (browserContext) {
        await browserContext.close().catch(() => {});
        browserContext = null;
        browserLaunchPromise = null;
        logActivity('browser', "Browser context closed gracefully.");
    }
}
