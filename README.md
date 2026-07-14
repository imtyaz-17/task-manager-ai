# Task Manager

Full-stack task manager with FastAPI, PostgreSQL, and a Node/Express frontend.

## Stack

- **frontend** — Express UI on host port `3001` (container `3000`)
- **api** — FastAPI on port `8000`
- **db** — PostgreSQL 16 on port `5432`

## Setup

1. Copy env defaults (already filled for local use):

```bash
cp .env.example .env
```

2. Start everything:

```bash
docker compose up --build
```

3. Open:

- App: http://localhost:3001
- API docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

## Environment

| Variable | Description |
|---|---|
| `POSTGRES_USER` | Database user |
| `POSTGRES_PASSWORD` | Database password |
| `POSTGRES_DB` | Database name |

`DATABASE_URL` for the API is built automatically in `compose.yml`.
