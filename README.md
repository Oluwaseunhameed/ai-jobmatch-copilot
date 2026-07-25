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

Pull a local LLM model (first time only):

```bash
docker exec jobmatch-ollama ollama pull llama3.2
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
```

### 5. Start all services

```bash
pnpm dev
```

Or start individually:

```bash
pnpm --filter @jobmatch/web dev      # http://localhost:3000
pnpm --filter @jobmatch/api dev      # http://localhost:4000
cd apps/ai-service && ./scripts/dev.sh  # http://localhost:8000
```

### 6. Verify

| Service | URL |
|---|---|
| Web app | http://localhost:3000 |
| API health | http://localhost:4000/api/v1/health |
| Swagger docs | http://localhost:4000/api/docs |
| AI service health | http://localhost:8000/health |

## Documentation

| Document | Purpose |
|---|---|
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System design and data flow |
| [docs/ROADMAP.md](./docs/ROADMAP.md) | Phased delivery plan |
| [docs/DECISIONS_LOG.md](./docs/DECISIONS_LOG.md) | Architecture decisions |
| [docs/TASKS.md](./docs/TASKS.md) | Current tasks and backlog |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| Backend | NestJS, Prisma, PostgreSQL, Redis, BullMQ |
| AI | FastAPI, LiteLLM, Ollama (dev), OpenAI + Anthropic (prod) |
| Auth | Clerk |
| Deploy | Vercel (web) + Railway/Fly.io (API) |

## License

TBD
