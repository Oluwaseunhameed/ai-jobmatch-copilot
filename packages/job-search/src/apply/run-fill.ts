import type { ApplyFillAttemptDto, ApplyFillFieldDto, AtsVendor } from '@jobmatch/types';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { atsVendorLabel } from './ats-detect';
import { buildSelectorPlan, type FieldSelectorPlan } from './field-map';

export type RunAtsFillInput = {
  applyUrl: string;
  fillPlan: ApplyFillFieldDto[];
  vendor: AtsVendor;
  /** When true, only plan selectors — do not launch Chromium. */
  dryRun?: boolean;
  headless?: boolean;
};

const WORKER_CANDIDATES = [
  process.env.PLAYWRIGHT_WORKER_PATH,
  '/opt/playwright/ats-fill-worker.mjs',
  path.join(process.cwd(), 'packages', 'job-search', 'scripts', 'ats-fill-worker.mjs'),
].filter((value): value is string => Boolean(value));

/**
 * Fill-only Playwright assist. Never clicks Submit / Apply.
 * Live ATS hosts require APPLY_AUTOMATION_LIVE=1 (or fixture URLs).
 *
 * Production (Render Docker): spawn the standalone worker under /opt/playwright
 * so Next.js never imports the playwright package into server chunks.
 * Local: fall back to in-process require when the worker is unavailable.
 */
export async function runAtsFill(input: RunAtsFillInput): Promise<ApplyFillAttemptDto> {
  const started = Date.now();
  const plan = buildSelectorPlan(input.fillPlan);
  const at = new Date().toISOString();

  if (input.dryRun) {
    return {
      vendor: input.vendor,
      ok: plan.length > 0,
      filled: plan.map((p) => p.fieldId),
      errors: plan.length ? [] : ['No fill-plan fields to map'],
      durationMs: Date.now() - started,
      at,
      browserRan: false,
    };
  }

  const allowed =
    input.vendor === 'fixture' || process.env.APPLY_AUTOMATION_LIVE === '1';

  if (!allowed) {
    return {
      vendor: input.vendor,
      ok: false,
      filled: [],
      errors: [
        `${atsVendorLabel(input.vendor)} fill is gated. Set APPLY_AUTOMATION_LIVE=1 for live ATS fill-only (never auto-submit), or use /apply-fixture.`,
      ],
      durationMs: Date.now() - started,
      at,
      browserRan: false,
    };
  }

  try {
    const workerPath = WORKER_CANDIDATES.find((candidate) => existsSync(candidate));
    const result = workerPath
      ? await runFillViaWorker(workerPath, {
          applyUrl: input.applyUrl,
          plan,
          headless: input.headless !== false,
        })
      : await runFillInProcess({
          applyUrl: input.applyUrl,
          plan,
          headless: input.headless !== false,
        });

    return {
      vendor: input.vendor,
      ok: result.ok,
      filled: result.filled,
      errors: result.errors,
      durationMs: Date.now() - started,
      at,
      browserRan: result.browserRan,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      vendor: input.vendor,
      ok: false,
      filled: [],
      errors: [`Playwright unavailable or failed: ${message}`],
      durationMs: Date.now() - started,
      at,
      browserRan: false,
    };
  }
}

type WorkerResult = {
  ok: boolean;
  filled: string[];
  errors: string[];
  browserRan: boolean;
};

function runFillViaWorker(
  workerPath: string,
  payload: { applyUrl: string; plan: FieldSelectorPlan[]; headless: boolean },
): Promise<WorkerResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [workerPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || '/ms-playwright',
      },
    });

    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Fill worker timed out after 90s (${workerPath})`));
    }, 90_000);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      const line = stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .at(-1);
      if (!line) {
        reject(
          new Error(
            `Fill worker produced no JSON (exit ${code})${stderr ? `: ${stderr.slice(0, 300)}` : ''}`,
          ),
        );
        return;
      }
      try {
        const parsed = JSON.parse(line) as WorkerResult;
        resolve({
          ok: Boolean(parsed.ok),
          filled: Array.isArray(parsed.filled) ? parsed.filled.map(String) : [],
          errors: Array.isArray(parsed.errors) ? parsed.errors.map(String) : [],
          browserRan: Boolean(parsed.browserRan),
        });
      } catch {
        reject(
          new Error(
            `Fill worker returned invalid JSON (exit ${code}): ${line.slice(0, 200)}`,
          ),
        );
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

/** Local-dev fallback when the Docker worker script is not present. */
async function runFillInProcess(input: {
  applyUrl: string;
  plan: FieldSelectorPlan[];
  headless: boolean;
}): Promise<WorkerResult> {
  const { chromium } = loadPlaywrightLocal();
  const browser = await chromium.launch({
    headless: input.headless,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const filled: string[] = [];
  const errors: string[] = [];

  try {
    const page = await browser.newPage();
    await page.goto(input.applyUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });

    for (const field of input.plan) {
      let wrote = false;
      for (const selector of field.selectors) {
        try {
          const locator = page.locator(selector).first();
          if ((await locator.count()) === 0) continue;
          await locator.fill(field.value, { timeout: 3_000 });
          filled.push(field.fieldId);
          wrote = true;
          break;
        } catch {
          // try next selector
        }
      }
      if (!wrote) {
        errors.push(`Could not locate field: ${field.label}`);
      }
    }

    return {
      ok: filled.length > 0,
      filled,
      errors,
      browserRan: true,
    };
  } finally {
    await browser.close();
  }
}

type PlaywrightChromium = {
  launch: (options?: {
    headless?: boolean;
    args?: string[];
  }) => Promise<{
    newPage: () => Promise<{
      goto: (url: string, opts?: { waitUntil?: string; timeout?: number }) => Promise<unknown>;
      locator: (selector: string) => {
        first: () => {
          count: () => Promise<number>;
          fill: (value: string, opts?: { timeout?: number }) => Promise<void>;
        };
      };
    }>;
    close: () => Promise<void>;
  }>;
};

function loadPlaywrightLocal(): { chromium: PlaywrightChromium } {
  const candidates = [
    process.env.PLAYWRIGHT_MODULE_PATH,
    path.join(process.cwd(), 'node_modules', 'playwright'),
    path.join(process.cwd(), 'apps', 'web', 'node_modules', 'playwright'),
  ].filter((value): value is string => Boolean(value));

  for (const root of candidates) {
    const pkgJson = path.join(root, 'package.json');
    if (!existsSync(pkgJson)) continue;
    const require = createRequire(pkgJson);
    const mod = require(root) as { chromium?: PlaywrightChromium };
    if (mod?.chromium) return { chromium: mod.chromium };
  }

  throw new Error(
    'Playwright worker missing and local playwright package not found. In Docker set PLAYWRIGHT_WORKER_PATH.',
  );
}
