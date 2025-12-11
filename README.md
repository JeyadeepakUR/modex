# Hospital Hold System (HHS)

A distributed resource locking system built with FastAPI and Next.js, designed for managing exclusive access to hospital resources with automatic expiration, heartbeat monitoring, and ML-based TTL optimization.

## 📋 Overview

The Hospital Hold System provides a robust mechanism for coordinating access to shared resources in distributed environments. It implements pessimistic locking with automatic lease expiration, ensuring that resources are never permanently locked even if clients crash or disconnect.

### Key Features

- **Exclusive Resource Locking**: Only one owner can hold a lock on a resource at any time
- **Auto-Expiring Locks**: Locks automatically expire based on configurable TTL
- **Heartbeat Mechanism**: Keep-alive updates prevent premature expiration
- **Transaction-Level Concurrency**: PostgreSQL `SELECT FOR UPDATE` ensures ACID compliance
- **ML-Based TTL Suggestions**: Historical data analysis for optimal lock duration
- **Real-Time Monitoring**: Live dashboard showing lock status and analytics
- **Background Worker**: Automatic cleanup of stale/expired locks

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Browser   │  │   Browser   │  │   Browser   │              │
│  │  (Next.js)  │  │  (Next.js)  │  │  (Next.js)  │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          │                                      │
│                   HTTP/REST API                                 │
│                          │                                      │
└──────────────────────────┼──────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│                    APPLICATION LAYER                            │
├──────────────────────────┼──────────────────────────────────────┤
│                          ▼                                      │
│              ┌───────────────────────┐                          │
│              │   FastAPI Server      │                          │
│              │   (main.py)           │                          │
│              │   Port: 8000          │                          │
│              └───────────┬───────────┘                          │
│                          │                                      │
│        ┌─────────────────┼─────────────────┐                    │
│        │                 │                 │                    │
│        ▼                 ▼                 ▼                    │
│  ┌──────────┐    ┌──────────┐     ┌──────────┐                  │
│  │Resources │    │  Locks   │     │    ML    │                  │
│  │  Router  │    │  Router  │     │  Router  │                  │
│  └────┬─────┘    └────┬─────┘     └────┬─────┘                  │
│       │               │                 │                       │
│       │               │                 │                       │
│       └───────────────┼─────────────────┘                       │
│                       │                                         │
│                       ▼                                         │
│              ┌─────────────────┐                                │
│              │  Database Pool  │                                │
│              │    (asyncpg)    │                                │
│              └────────┬────────┘                                │
│                       │                                         │
│       ┌───────────────┴───────────────┐                         │
│       │                               │                         │
│       ▼                               ▼                         │
│  ┌─────────┐                    ┌──────────┐                    │
│  │ Worker  │                    │  API     │                    │
│  │ Process │◄───────────────────┤ Handlers │                    │
│  │(worker  │   Shared DB        └──────────┘                    │
│  │  .py)   │                                                    │
│  └────┬────┘                                                    │
│       │                                                         │
│       │ Every 5s: Check & Expire Stale Locks                    │
│       │                                                         │
└───────┼─────────────────────────────────────────────────────────┘
        │
┌───────┼───────────────────────────────────────────────────────┐
│       │                 DATA LAYER                            │
├───────┼───────────────────────────────────────────────────────┤
│       ▼                                                       │
│  ┌─────────────────────────────────┐                          │
│  │     PostgreSQL Database         │                          │
│  │     (Supabase/Self-hosted)      │                          │
│  ├─────────────────────────────────┤                          │
│  │  Tables:                        │                          │
│  │  • resources                    │                          │
│  │    - id (uuid, PK)              │                          │
│  │    - type, identifier           │                          │
│  │    - UNIQUE(type, identifier)   │                          │
│  │                                 │                          │
│  │  • locks                        │                          │
│  │    - id (uuid, PK)              │                          │
│  │    - resource_id (FK)           │                          │
│  │    - owner_id                   │                          │
│  │    - status (HELD/RELEASED/     │                          │
│  │              EXPIRED)           │                          │
│  │    - ttl_seconds                │                          │
│  │    - created_at                 │                          │
│  │    - last_heartbeat             │                          │
│  │    - UNIQUE(resource_id)        │                          │
│  └─────────────────────────────────┘                          │
└───────────────────────────────────────────────────────────────┘
```

---

## 🔄 Lock Lifecycle Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ 1. POST /api/locks/acquire
       │    { resource_id, owner_id, ttl_seconds }
       ▼
┌──────────────────────────────────────┐
│  BEGIN TRANSACTION                   │
│  SELECT * FROM locks                 │
│    WHERE resource_id = $1            │
│    FOR UPDATE                        │◄─── Pessimistic Lock
└──────┬───────────────────────────────┘
       │
       ▼
   ┌───────────────┐
   │ Lock Exists?  │
   └───┬───────┬───┘
       │       │
    YES│       │NO
       │       │
       ▼       ▼
   ┌────────┐ ┌──────────────┐
   │Expired?│ │INSERT new    │
   └───┬─┬──┘ │lock (HELD)   │
       │ │    └──────┬───────┘
    YES│ │NO         │
       │ │           │
       │ │           ▼
       │ │      ┌─────────────┐
       │ │      │   COMMIT    │
       │ │      └──────┬──────┘
       │ │             │
       │ └────────┐    │
       │          │    │
       ▼          ▼    ▼
   ┌─────────┐ ┌───────────┐
   │ UPDATE  │ │  Return   │
   │ to HELD │ │  409      │
   └────┬────┘ │ Conflict  │
        │      └───────────┘
        ▼
   ┌─────────────┐
   │   COMMIT    │
   └──────┬──────┘
          │
          ▼
   ┌──────────────┐
   │Return 200 OK │
   │  + Lock Data │
   └──────┬───────┘
          │
          ▼
   ┌──────────────────────┐
   │ Client Holds Lock    │
   └──────┬───────────────┘
          │
          │ Periodic Heartbeats
          │ POST /api/locks/heartbeat
          │ (Updates last_heartbeat)
          │
          ▼
   ┌──────────────────────┐
   │  Lock Active         │
   │  (while heartbeating)│
   └──────┬───────────────┘
          │
          │ Either:
          │ a) POST /api/locks/release
          │ b) TTL expires (no heartbeat)
          │
          ▼
   ┌──────────────────────┐
   │ Lock Released or     │
   │ Expired (by worker)  │
   └──────────────────────┘
```

---

## 🛠️ Backend Architecture

### Components

#### 1. **FastAPI Application** (`main.py`)
   - ASGI server running on port 8000
   - CORS middleware for cross-origin requests
   - Route registration for resources, locks, and ML endpoints

#### 2. **Database Layer** (`db.py`)
   - Connection pooling with asyncpg (min: 2, max: 10)
   - Environment-based configuration via `.env`
   - Async context manager for connection lifecycle

#### 3. **Routes**

   **Resources Router** (`routes/resources.py`)
   - `POST /api/resources` - Create new resource
   - `GET /api/resources` - List all resources
   - `GET /api/resources/{id}` - Get specific resource

   **Locks Router** (`routes/locks.py`)
   - `POST /api/locks/acquire` - Acquire exclusive lock
   - `POST /api/locks/release` - Release owned lock
   - `POST /api/locks/heartbeat` - Update lease expiration
   - `GET /api/locks/{resource_id}` - Get lock status
   - `GET /api/locks` - List all locks

   **ML Router** (`routes/ml.py`)
   - `POST /api/ml/suggest` - Get TTL recommendations and anomaly scores

#### 4. **Background Worker** (`worker.py`)
   - Runs independently as separate process
   - Every 5 seconds: scans for expired locks
   - Marks locks as EXPIRED when `(now - last_heartbeat) > ttl_seconds`

#### 5. **Concurrency Test** (`concurrency_test.py`)
   - Sends 50 parallel lock acquisition requests
   - Validates that only ONE succeeds (exclusivity guarantee)
   - Uses aiohttp for async HTTP requests

### Concurrency Control

The system uses **database-level pessimistic locking**:

```sql
BEGIN;
SELECT * FROM locks WHERE resource_id = $1 FOR UPDATE;
-- Critical section: check expiry, update/insert
COMMIT;
```

This ensures:
- **Mutual Exclusion**: Only one transaction can hold the row lock
- **Atomicity**: All-or-nothing lock acquisition
- **Consistency**: No phantom reads or race conditions
- **Isolation**: Serializable lock state transitions

---

## 🚀 Setup Guide

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+ (or Supabase account)
- Git

### 1. Clone Repository

```bash
git clone <repository-url>
cd modex
```

### 2. Backend Setup

#### Install Dependencies

```bash
cd backend
python -m venv .venv
# On Windows (PowerShell)
.\.venv\Scripts\Activate.ps1
# On Linux/macOS
source .venv/bin/activate

pip install -r requirements.txt
```

#### Configure Database

Copy the example environment file and configure your database:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your database connection string:

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

**For Supabase:**
- Go to Project Settings → Database → Connection String
- Select "Direct Connection" mode
- Copy the URI and update `.env` file
- **Important**: URL-encode special characters in password (see `.env.example`)

**For Railway/Render:**
- Use the provided `DATABASE_URL` environment variable automatically

#### Run Migrations

**Linux/macOS:**
```bash
psql $DATABASE_URL -f migrations/001_init.sql
```

**Windows (PowerShell):**
```powershell
psql $env:DATABASE_URL -f migrations/001_init.sql
```

#### Start Backend Server

```bash
python main.py
```

Server runs on `http://localhost:8000`

#### Start Background Worker (separate terminal)

```bash
cd backend
# Activate venv first
python worker.py
```

### 3. Frontend Setup

#### Install Dependencies

```bash
cd frontend
npm install
```

#### Configure API URL

Copy the example environment file and configure the API URL:

```bash
cp frontend/.env.example frontend/.env.local
```

Edit `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

**For production deployment**, update with your backend URL:
```env
NEXT_PUBLIC_API_BASE_URL=https://your-backend.railway.app/api
```

#### Start Development Server

```bash
npm run dev
```

Frontend runs on `http://localhost:3000`

### 4. Run Concurrency Test

```bash
cd backend
python concurrency_test.py
```

Expected output:
```
Creating test resource...
Resource ID: <uuid>
Sending 50 parallel acquire requests...
============================================================
RESULTS:
============================================================
✓ Successful acquisitions: 1
✗ Conflicts (409): 49
✗ Errors: 0
============================================================
✓ Concurrency test PASSED: Only one lock acquired!
```

---

## 📊 Usage Examples

### Acquire a Lock

```bash
curl -X POST http://localhost:8000/api/locks/acquire \
  -H "Content-Type: application/json" \
  -d '{
    "resource_id": "123e4567-e89b-12d3-a456-426614174000",
    "owner_id": "service-a",
    "ttl_seconds": 300
  }'
```

### Send Heartbeat

```bash
curl -X POST http://localhost:8000/api/locks/heartbeat \
  -H "Content-Type: application/json" \
  -d '{
    "resource_id": "123e4567-e89b-12d3-a456-426614174000",
    "owner_id": "service-a"
  }'
```

### Release Lock

```bash
curl -X POST http://localhost:8000/api/locks/release \
  -H "Content-Type: application/json" \
  -d '{
    "resource_id": "123e4567-e89b-12d3-a456-426614174000",
    "owner_id": "service-a"
  }'
```

### Get ML TTL Suggestion

```bash
curl -X POST http://localhost:8000/api/ml/suggest \
  -H "Content-Type: application/json" \
  -d '{
    "resource_id": "123e4567-e89b-12d3-a456-426614174000",
    "owner_id": "service-a"
  }'
```

Response:
```json
{
  "suggested_ttl": 285,
  "anomaly_score": 0.123
}
```

---

## 🔧 Configuration

### Environment Variables

**Backend** (`.env`):
- `DATABASE_URL` - PostgreSQL connection string

**Frontend** (`.env.local`):
- `NEXT_PUBLIC_API_BASE_URL` - Backend API base URL

### Database Tuning

For high-concurrency scenarios, adjust pool settings in `db.py`:

```python
_pool = await asyncpg.create_pool(
    database_url, 
    min_size=5,      # Increase minimum connections
    max_size=20      # Increase maximum connections
)
```

---

## 📈 Monitoring

### Health Checks

- Backend: `http://localhost:8000/`
- Database: Check worker logs for connection errors

### Key Metrics

Monitor these in production:
- Lock acquisition latency
- Lock hold duration
- Heartbeat frequency
- Expired lock count
- Database connection pool utilization

---

## 🚢 Deployment

### Backend Deployment (Railway)

1. **Create Railway Account** and install CLI:
   ```bash
   npm i -g @railway/cli
   railway login
   ```

2. **Initialize Project**:
   ```bash
   cd backend
   railway init
   ```

3. **Add PostgreSQL Database**:
   - In Railway dashboard, click "New" → "Database" → "PostgreSQL"
   - Railway automatically sets `DATABASE_URL` environment variable

4. **Deploy Backend**:
   ```bash
   railway up
   ```

5. **Deploy Worker** (as separate service):
   - Create new service in Railway
   - Link to same database
   - Set start command: `python worker.py`

**Environment Variables (Railway automatically provides):**
- `DATABASE_URL` - Auto-generated when you add PostgreSQL
- `PORT` - Auto-generated (Railway uses this)

### Frontend Deployment (Vercel)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   cd frontend
   vercel
   ```

3. **Set Environment Variable** in Vercel dashboard:
   - Go to Project Settings → Environment Variables
   - Add `NEXT_PUBLIC_API_BASE_URL` with your Railway backend URL
   - Format: `https://your-app.up.railway.app/api`

4. **Redeploy** to apply environment changes:
   ```bash
   vercel --prod
   ```

### Alternative: Docker Deployment

Create `Dockerfile` in backend directory:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "main.py"]
```

Build and run:
```bash
docker build -t hhs-backend .
docker run -e DATABASE_URL=your_url -p 8000:8000 hhs-backend
```

### Post-Deployment Checklist

- [ ] Run database migrations on production database
- [ ] Verify backend health check: `https://your-backend/`
- [ ] Verify frontend can connect to backend
- [ ] Ensure worker service is running
- [ ] Test lock acquisition via API
- [ ] Monitor logs for errors

---

## 🧪 Testing

### Unit Tests

```bash
cd backend
pytest tests/
```

### Load Testing

```bash
# Use concurrency_test.py with higher request count
python concurrency_test.py
```

---

## 🐛 Troubleshooting

### Issue: `asyncpg.exceptions.InvalidPasswordError`

**Solution**: URL-encode special characters in password or wrap connection string in quotes in `.env`:
```env
DATABASE_URL=postgresql://user:my%23pass@host/db
```

### Issue: `socket.gaierror: [Errno 11001] getaddrinfo failed`

**Solution**: Verify database hostname is reachable. Check network/firewall settings.

### Issue: Frontend shows "No resources available"

**Solution**: 
1. Ensure backend is running on port 8000
2. Check `NEXT_PUBLIC_API_BASE_URL` in frontend `.env.local`
3. Verify CORS is enabled in backend

### Issue: Locks not expiring

**Solution**: Ensure worker process is running continuously

---

## 📝 License

MIT License - see LICENSE file for details

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit pull request

---

## 📧 Support

For issues and questions, please open a GitHub issue.
