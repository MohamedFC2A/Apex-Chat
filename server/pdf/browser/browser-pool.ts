/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  APEX PDF — Browser Pool v4.0 (Pool Pattern)                             ║
 * ║  Manages N Puppeteer browser instances with health monitoring             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import type { Browser } from "puppeteer";
import { BROWSER_POOL_MAX, BROWSER_LAUNCH_ARGS, PDF_GENERATION_TIMEOUT_MS } from "../../../shared/pdf/constants.js";

type BrowserEntry = {
  browser: Browser;
  healthy: boolean;
  createdAt: number;
  jobCount: number;
};

class BrowserPoolManager {
  private pool: BrowserEntry[] = [];
  private waitQueue: Array<(browser: Browser) => void> = [];
  private totalCreated = 0;

  private async spawnBrowser(): Promise<BrowserEntry> {
    const puppeteer = (await import("puppeteer")).default;
    const browser = await puppeteer.launch({
      headless: true,
      args: [...BROWSER_LAUNCH_ARGS],
    });

    // Monitor for disconnection
    browser.on("disconnected", () => {
      this.pool = this.pool.filter((e) => e.browser !== browser);
      console.warn("[BrowserPool] Browser disconnected — removed from pool");
      // Spawn a replacement if pool is empty
      if (this.pool.length === 0 && this.waitQueue.length > 0) {
        this.spawnBrowser().then((entry) => {
          this.pool.push(entry);
          this.totalCreated++;
          this._dispatchWaiting();
        }).catch(console.error);
      }
    });

    this.totalCreated++;
    return { browser, healthy: true, createdAt: Date.now(), jobCount: 0 };
  }

  async acquire(): Promise<Browser> {
    // Check available healthy browsers
    const available = this.pool.find((e) => e.healthy);
    if (available) {
      this.pool = this.pool.filter((e) => e !== available);
      available.jobCount++;
      return available.browser;
    }

    // Can we spawn a new one?
    if (this.totalCreated < BROWSER_POOL_MAX) {
      const entry = await this.spawnBrowser();
      entry.jobCount++;
      return entry.browser;
    }

    // Wait for one to be released
    return new Promise<Browser>((resolve) => {
      const timeout = setTimeout(() => {
        this.waitQueue = this.waitQueue.filter((r) => r !== resolve);
        // Spawn emergency browser
        this.spawnBrowser().then((entry) => {
          resolve(entry.browser);
        }).catch(() => resolve(undefined as unknown as Browser));
      }, PDF_GENERATION_TIMEOUT_MS / 2);

      this.waitQueue.push((browser) => {
        clearTimeout(timeout);
        resolve(browser);
      });
    });
  }

  async release(browser: Browser): Promise<void> {
    try {
      // Health check: verify browser is still connected
      const pages = await Promise.race([
        browser.pages(),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error("timeout")), 2000)),
      ]);

      if (pages !== null && this.pool.length < BROWSER_POOL_MAX) {
        this.pool.push({ browser, healthy: true, createdAt: Date.now(), jobCount: 0 });
        this._dispatchWaiting();
        return;
      }
    } catch {
      // Browser is unhealthy
      console.warn("[BrowserPool] Unhealthy browser — closing");
    }

    try { await browser.close(); } catch { /* ignore */ }
    this.totalCreated = Math.max(0, this.totalCreated - 1);
  }

  private _dispatchWaiting(): void {
    if (this.waitQueue.length > 0 && this.pool.length > 0) {
      const resolve = this.waitQueue.shift()!;
      const entry = this.pool.shift()!;
      resolve(entry.browser);
    }
  }

  async shutdown(): Promise<void> {
    await Promise.all(this.pool.map((e) => e.browser.close().catch(() => {})));
    this.pool = [];
    this.totalCreated = 0;
    console.log("[BrowserPool] All browsers shut down");
  }

  get stats() {
    return {
      poolSize: this.pool.length,
      totalCreated: this.totalCreated,
      waitingJobs: this.waitQueue.length,
    };
  }
}

export const browserPool = new BrowserPoolManager();
