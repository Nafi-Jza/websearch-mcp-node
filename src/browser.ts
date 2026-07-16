import { chromium, BrowserContext } from 'playwright';
import path from 'path';
import { logActivity } from './utils/logger.js';

// Define standard paths and constants
export const PROFILE_DIR = path.join(process.cwd(), 'browser-profile');
export const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// Attempt to find Brave Browser based on common Windows paths
export function getBravePath(): string | undefined {
    const paths = [
        "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
        "C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
        `${process.env.LOCALAPPDATA}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`
    ];

    for (const p of paths) {
        try {
            if (require('fs').existsSync(p)) return p;
        } catch (e) {
            // ignore
        }
    }
    return undefined; // Let playwright use its bundled chromium
}

/**
 * Launches a fresh persistent browser context.
 * We no longer use a singleton to avoid "Target page/context closed" errors.
 * Each tool call will launch and close its own browser context.
 */
export async function launchBrowser(headed: boolean = false): Promise<BrowserContext> {
    const executablePath = getBravePath();

    logActivity('browser', `Launching fresh persistent context... (Headed: ${headed})`);

    const launchOptions: any = {
        headless: !headed,
        viewport: { width: 1280, height: 720 },
        userAgent: USER_AGENT,
        // Add some standard args to avoid detection
        args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
            '--window-position=0,0',
            '--ignore-certificate-errors',
            '--ignore-certificate-errors-spki-list',
        ]
    };

    if (executablePath) {
        launchOptions.executablePath = executablePath;
    }

    try {
        const context = await chromium.launchPersistentContext(PROFILE_DIR, launchOptions);
        logActivity('browser', "Browser context launched successfully.");
        return context;
    } catch (error) {
        logActivity('browser-error', `Failed to launch persistent context: ${(error as Error).message}`);
        throw new Error(`Failed to launch browser: ${(error as Error).message}`);
    }
}
