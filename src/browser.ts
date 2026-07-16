import { chromium, BrowserContext } from 'playwright';
import path from 'path';
import { logActivity } from './utils/logger.js';

// Define standard paths and constants
export const PROFILE_DIR = path.join(process.cwd(), 'browser-profile');
export const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

let browserContext: BrowserContext | null = null;
let isHeaded = false;

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

export async function getBrowserContext(headed: boolean = false): Promise<BrowserContext> {
    // Self-healing check: if we have a context, make sure it's actually alive
    if (browserContext) {
        try {
            browserContext.pages(); // This throws if the browser process died or was closed manually
        } catch (e) {
            logActivity('browser-warning', 'Existing browser context is dead. Resetting...');
            browserContext = null;
        }
    }

    // FIX: Removed the aggressive isHeaded !== headed check.
    // If a context is already running (e.g., search started a headed one),
    // and scrape asks for a headless one, we will just return the existing headed one.
    // This prevents tools from yanking the browser out from under each other concurrently!

    if (!browserContext) {
        const executablePath = getBravePath();

        logActivity('browser', `Launching persistent context... (Headed: ${headed})`);

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

        if (executablePath) {
            launchOptions.executablePath = executablePath;
        }

        try {
            browserContext = await chromium.launchPersistentContext(PROFILE_DIR, launchOptions);
            isHeaded = headed;
            logActivity('browser', "Browser context launched successfully.");

            // Listen for context close and clear the global reference
            browserContext.on('close', () => {
                logActivity('browser', "Browser context was closed by user or OS.");
                browserContext = null;
            });
        } catch (error) {
            logActivity('browser-error', `Failed to launch persistent context. Make sure no other instances are using this profile! Error: ${(error as Error).message}`);
            throw new Error(`Failed to launch browser: ${(error as Error).message}`);
        }
    }

    return browserContext;
}

export async function closeBrowserContext(): Promise<void> {
    if (browserContext) {
        await browserContext.close().catch(() => {});
        browserContext = null;
        logActivity('browser', "Browser context closed gracefully.");
    }
}
