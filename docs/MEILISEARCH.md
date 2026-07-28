# Meilisearch setup (Wave 2)

Optional keyword search upgrade. Without it, Postgres full-text search remains the default.

## Start

```bash
docker compose up -d meilisearch
```

Add to `apps/web/.env.local` and/or `apps/api/.env`:

```bash
MEILI_HOST="http://127.0.0.1:7700"
MEILI_API_KEY="jobmatch_meili_dev_key"
MEILI_INDEX_JOBS="jobs"
```

## Index jobs

```bash
pnpm jobs:reindex
```

New ingest upserts best-effort sync into Meilisearch when `MEILI_HOST` is set.

## Behaviour

- Keyword queries use Meilisearch when healthy.
- Hybrid / semantic ranking still uses Postgres + pgvector.
- If Meilisearch is down, search falls back to Postgres FTS automatically.
