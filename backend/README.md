# HHS Backend

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set DATABASE_URL environment variable:
```bash
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
```

3. Run migrations:

**On Linux/macOS (bash):**
```bash
psql $DATABASE_URL -f migrations/001_init.sql
```

**On Windows (cmd):**
```cmd
set DATABASE_URL=postgresql://user:pass@host:5432/dbname
psql %DATABASE_URL% -f migrations/001_init.sql
```

**On Windows (PowerShell):**
```powershell
$env:DATABASE_URL="postgresql://user:pass@host:5432/dbname"
psql $env:DATABASE_URL -f migrations/001_init.sql
```

> Note: `psql` is the PostgreSQL command-line tool. Make sure PostgreSQL is installed and `psql` is available in your PATH.

## Run

Start API server:
```bash
python main.py
```

Start background worker:
```bash
python worker.py
```

## Test Concurrency

```bash
python concurrency_test.py
```

## Deploy (Railway)

1. Create PostgreSQL database
2. Set DATABASE_URL environment variable
3. Deploy: `railway up`
