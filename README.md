# AI JobMatch Copilot

An AI-powered SaaS platform that helps job seekers build a career profile once, optimize resumes for specific roles, discover matching jobs, automate applications, and track their entire job search pipeline.

## Monorepo Structure

```
ai-jobmatch-copilot/
├── apps/
│   ├── web/           # Next.js 15 frontend (port 3000)
│   ├── api/           # NestJS REST API (port 4000)
│   └── ai-service/    # FastAPI AI service (port 8000)
├── packages/
│   ├── database/      # Prisma schema + client
│   ├── storage/       # Local + S3-compatible file storage
│   ├── types/         # Shared TypeScript types
│   └── typescript-config/
├── docs/              # Architecture, roadmap, decisions, tasks
└── docker-compose.yml # Postgres, Redis, Ollama
```

## Prerequisites

- Node.js 22+ (see `.nvmrc`)
- pnpm 9+
- Docker & Docker Compose
- Python 3.11+ (for AI service)

## Local Development

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start infrastructure

```bash
docker compose up -d
```

This starts:

- **PostgreSQL** (with pgvector) on port **5434** (host)
- **Redis** on port 6379
- **Ollama** on port 11434

Pull local models (first time only):

```bash
docker exec jobmatch-ollama ollama pull llama3.2
docker exec jobmatch-ollama ollama pull nomic-embed-text
```

If you run Ollama on the host instead of Docker (as this project does for day-to-day
dev), the same commands work without `docker exec`:

```bash
ollama pull llama3.2
ollama pull nomic-embed-text
```

### 3. Configure environment

```bash
cp .env.example packages/database/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
cp apps/ai-service/.env.example apps/ai-service/.env
```

### 4. Set up the database

```bash
pnpm db:generate
pnpm db:push
pnpm db:seed          # 10 companies, 60 sample jobs
pnpm jobs:embed       # embed postings for semantic search (needs AI service + Ollama)
```

`pnpm jobs:embed` calls the AI service, so start it first (`pnpm dev:ai` or
`pnpm dev`). Keyword search works without embeddings; semantic / hybrid ranking
needs this step.

### 5. Start all services

```bash
pnpm dev
```

This starts the web app, the API (including the resume-parse queue worker), **and
the Python AI service**. The AI service creates its own virtualenv
(`apps/ai-service/.venv`) and installs Python dependencies on first run, so no
manual `pip install` step is needed. Redis (from `docker compose up -d`) is
required for background parsing; without it, parsing falls back to running
inline in the web request.

Or start individually:

```bash
pnpm --filter @jobmatch/web dev   # http://localhost:3000
pnpm --filter @jobmatch/api dev   # http://localhost:4000
pnpm dev:ai                       # http://localhost:8000
```

Resume parsing (Module 4) calls the AI service, so it must be running — the web
app reports "Could not reach the AI service" on the resume card when it is not.

Useful AI service commands:

```bash
pnpm setup:ai            # install/refresh Python dependencies
pnpm test:ai             # run the Python test suite
INSTALL_LLM=1 pnpm setup:ai   # add optional LLM enrichment (litellm)
```

### 6. Verify

| Service           | URL                                 |
| ----------------- | ----------------------------------- |
| Web app           | http://localhost:3000               |
| API health        | http://localhost:4000/api/v1/health |
| Swagger docs      | http://localhost:4000/api/docs      |
| AI service health | http://localhost:8000/health        |

## Troubleshooting

| Symptom                                            | Cause and fix                                                                                                                                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resume card shows "Could not reach the AI service" | The AI service is not running. Start it with `pnpm dev:ai`, or run `pnpm dev` to start everything. Confirm with `curl http://localhost:8000/health`.                                        |
| Resume stays Queued / Parsing forever              | The API worker is not running, or Redis is down. Confirm Redis with `redis-cli ping`, then restart `pnpm --filter @jobmatch/api dev`. The worker logs `worker.started` on boot.             |
| Resume card shows "No readable text found"         | The PDF is a scan or image-only export. Re-export a text-based PDF or upload a DOCX (OCR is not supported).                                                                                 |
| Job search says "No job embeddings yet"            | Run `pnpm jobs:embed` after `pnpm db:seed`. Confirm Ollama has the model with `ollama list \| grep nomic`.                                                                                  |
| Job search falls back to keyword-only              | The AI service is down, or embeddings are disabled (`EMBEDDINGS_ENABLED=false`). Check `curl http://localhost:8000/v1/embeddings` with a POST body `{"texts":["test"]}`.                    |
| `pnpm dev` fails to start the AI service           | `python3` is missing from PATH. Install Python 3.11+, or point at another interpreter with `PYTHON_BIN=/path/to/python pnpm setup:ai`.                                                      |
| Parsed skills look thin                            | Only heuristic extraction ran. Install the optional LLM extras with `INSTALL_LLM=1 pnpm setup:ai` and make sure Ollama is running, then re-run `pnpm eval:ai -- --llm` to measure the gain. |

## AI quality baseline

```bash
pnpm eval:ai                 # heuristics only (offline, deterministic)
pnpm eval:ai -- --llm        # include LLM enrichment
```

A run prints a per-case score. Use it before and after prompt or heuristic changes — without a baseline, "the AI got better" is an opinion.

## Documentation

| Document                                         | Purpose                     |
| ------------------------------------------------ | --------------------------- |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)   | System design and data flow |
| [docs/ROADMAP.md](./docs/ROADMAP.md)             | Phased delivery plan        |
| [docs/DECISIONS_LOG.md](./docs/DECISIONS_LOG.md) | Architecture decisions      |
| [docs/TASKS.md](./docs/TASKS.md)                 | Current tasks and backlog   |

## Tech Stack

| Layer    | Technology                                                  |
| -------- | ----------------------------------------------------------- |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| Backend  | NestJS, Prisma, PostgreSQL, Redis, BullMQ                   |
| AI       | FastAPI, LiteLLM, Ollama (dev), OpenAI + Anthropic (prod)   |
| Auth     | Clerk                                                       |
| Deploy   | Vercel (web) + Railway/Fly.io (API)                         |

## License

TBD
