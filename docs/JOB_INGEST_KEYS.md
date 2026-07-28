# Job ingest keys & ATS boards (Wave 2)

Use these to unlock USAJobs, Adzuna, and company ATS feeds.

## 1. Check what’s ready

```bash
pnpm jobs:ingest -- --status
```

- ATS boards (Greenhouse / Lever / Ashby / Workable) are **ready by default** via curated public board tokens.
- Adzuna + USAJobs stay **blocked** until you add keys.

## 2. Get API keys

### Adzuna (includes Nigeria with `ng`)

1. Sign up: https://developer.adzuna.com/
2. Create an app → copy **App ID** and **App Key**
3. Add to `apps/api/.env` (and optionally root `.env`):

```bash
ADZUNA_APP_ID="your_app_id"
ADZUNA_APP_KEY="your_app_key"
ADZUNA_COUNTRIES="us,gb,ca,au"   # ISO path codes (gb = UK). Nigeria (`ng`) is not supported by Adzuna.
ADZUNA_WHAT="software engineer"
```

### USAJobs (U.S. federal)

1. Request a key: https://developer.usajobs.gov/APIRequest/Index
2. Add:

```bash
USAJOBS_API_KEY="your_key"
USAJOBS_USER_AGENT="you@example.com"   # email used when requesting the key
USAJOBS_KEYWORD="software"
```

## 3. ATS boards (no API key)

Defaults already include boards like Shopify, GitHub, Stripe, OpenAI, etc.

Override anytime:

```bash
GREENHOUSE_BOARDS="shopify,github,stripe"
LEVER_BOARDS="spotify,netflix"
ASHBY_BOARDS="openai,anthropic"
WORKABLE_BOARDS="automattic"
# INGEST_ATS_DEFAULTS="false"   # disable curated defaults
```

## 4. Run ingest

```bash
# Only keyed + ATS providers that are ready
pnpm jobs:ingest -- --keyed

# Public providers + any ready keyed/ATS
pnpm jobs:ingest -- --include-keyed

# Explicit list
pnpm jobs:ingest -- --providers adzuna,usajobs,greenhouse,lever,ashby,workable
```
