#!/usr/bin/env node
/**
 * Standalone fill-only Playwright worker for production Docker.
 *
 * CommonJS (.cjs) on purpose — must use require(), and must not be treated as
 * ESM (a sibling package.json from `npm init` may set "type": "module").
 *
 * Protocol: JSON on stdin → JSON on stdout
 *   in:  { applyUrl, plan: [{ fieldId, label, value, selectors }], headless? }
 *   out: { ok, filled, errors, browserRan }
 *
 * Never clicks Submit / Apply.
 */

'use strict';

const { createRequire } = require('node:module');

const requireFromHere = createRequire(__filename);

async function main() {
  const input = await readStdinJson();
  const applyUrl = String(input.applyUrl || '');
  const plan = Array.isArray(input.plan) ? input.plan : [];
  const headless = input.headless !== false;

  if (!applyUrl) {
    writeResult({ ok: false, filled: [], errors: ['applyUrl is required'], browserRan: false });
    process.exit(1);
  }

  let chromium;
  try {
    ({ chromium } = requireFromHere('playwright'));
  } catch (error) {
    writeResult({
      ok: false,
      filled: [],
      errors: [
        `Worker cannot load playwright: ${error instanceof Error ? error.message : String(error)}`,
      ],
      browserRan: false,
    });
    process.exit(1);
  }

  const filled = [];
  const errors = [];
  let browser;

  try {
    browser = await chromium.launch({
      headless,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });
    const page = await browser.newPage();
    await page.goto(applyUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });

    for (const field of plan) {
      const selectors = Array.isArray(field.selectors) ? field.selectors : [];
      let wrote = false;
      for (const selector of selectors) {
        try {
          const locator = page.locator(selector).first();
          if ((await locator.count()) === 0) continue;
          await locator.fill(String(field.value ?? ''), { timeout: 3_000 });
          filled.push(field.fieldId);
          wrote = true;
          break;
        } catch {
          // try next selector
        }
      }
      if (!wrote) {
        errors.push(`Could not locate field: ${field.label || field.fieldId}`);
      }
    }

    // Hard rule: never click submit/apply buttons.
    writeResult({
      ok: filled.length > 0,
      filled,
      errors,
      browserRan: true,
    });
  } catch (error) {
    writeResult({
      ok: false,
      filled,
      errors: [
        ...errors,
        `Playwright failed: ${error instanceof Error ? error.message : String(error)}`,
      ],
      browserRan: Boolean(browser),
    });
    process.exitCode = 1;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // ignore
      }
    }
  }
}

function readStdinJson() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => {
      try {
        const raw = chunks.join('').trim() || '{}';
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    process.stdin.on('error', reject);
  });
}

function writeResult(result) {
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

main().catch((error) => {
  writeResult({
    ok: false,
    filled: [],
    errors: [error instanceof Error ? error.message : String(error)],
    browserRan: false,
  });
  process.exit(1);
});
