# Frontdesk Backend

Node.js + Express backend API for the Frontdesk AI Supervisor system.

## Structure

```
backend/
├── api/                    # Express API server
│   ├── routes/            # API endpoints
│   │   ├── help-requests.js
│   │   └── knowledge-base.js
│   ├── services/          # Business logic
│   │   ├── helpRequest.service.js
│   │   └── knowledge.service.js
│   ├── jobs/              # Background jobs
│   │   └── timeout-monitor.js
│   └── server.js          # Main server file
├── db/                    # Database layer
│   ├── config.js          # PostgreSQL connection
│   ├── migrate.js         # Migration runner
│   ├── migrations/        # SQL migration files
│   └── seeds/             # Seed data
├── .env                   # Environment variables (gitignored)
├── package.json           # Dependencies
└── README.md              # This file
```

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Database created: `frontdesk_ai`

## Installation

```bash
cd backend
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=frontdesk_ai
DB_USER=postgres
DB_PASSWORD=postgres

# API Configuration
API_BASE_URL=http://localhost:3000/api

# Request Timeout (in minutes)
REQUEST_TIMEOUT_MINUTES=30
```

## Database Setup

Run migrations:
```bash
node db/migrate.js
```

Seed initial data:
```bash
node db/seeds/seed.js
```

## Running the Server

### Development
```bash
node api/server.js
```

The server will start on port 3000 (or the port specified in `.env`).

### Features
- ✅ REST API endpoints for help requests and knowledge base
- ✅ Integrated timeout monitor (runs every minute via cron)
- ✅ PostgreSQL connection pooling
- ✅ CORS enabled for frontend
- ✅ Request logging middleware
- ✅ Graceful shutdown handling

## API Endpoints

### Help Requests
- `GET /api/help-requests` - List all requests (filterable)
- `GET /api/help-requests/:id` - Get single request
- `GET /api/help-requests/stats` - Get statistics
- `POST /api/help-requests` - Create new request
- `POST /api/help-requests/:id/respond` - Supervisor responds
- `POST /api/help-requests/process-timeouts` - Manual timeout processing

### Knowledge Base
- `GET /api/knowledge-base` - List all entries
- `GET /api/knowledge-base/:id` - Get single entry
- `GET /api/knowledge-base/search?q=query` - Search entries
- `GET /api/knowledge-base/stats` - Get statistics
- `POST /api/knowledge-base` - Create new entry
- `PATCH /api/knowledge-base/:id` - Update entry
- `DELETE /api/knowledge-base/:id` - Delete entry (soft delete)

## Timeout Monitor

The timeout monitor runs automatically when the server starts:
- Checks every minute for pending requests that have passed their timeout
- Changes status from `pending` → `unresolved`
- Logs timed-out requests to console
- Configurable timeout period via `REQUEST_TIMEOUT_MINUTES` env var

## Health Check

Check server health:
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-05T18:33:57.293Z",
  "database": "connected"
}
```

## Testing

Test the API is running:
```bash
curl http://localhost:3000/api/help-requests/stats
```

## Production Deployment

For production, consider:
- Use PM2 or similar process manager
- Set `NODE_ENV=production`
- Use environment-specific database credentials
- Enable HTTPS
- Add rate limiting
- Set up monitoring/logging service

## Architecture Notes

### Request Lifecycle
1. Agent creates help request via API (`pending` status)
2. Supervisor responds via UI
3. Status changes to `resolved`, answer added to knowledge base
4. If no response within timeout period, status changes to `unresolved`

### Timeout Handling
- Uses `node-cron` for scheduled tasks
- Runs SQL query to find pending requests past timeout
- Updates status in single atomic operation
- No external dependencies required

### Database Connection
- PostgreSQL connection pooling (20 max connections)
- Automatic reconnection handling
- Graceful shutdown on SIGTERM/SIGINT

## Troubleshooting

**Server won't start:**
- Check PostgreSQL is running: `psql -U postgres -d frontdesk_ai`
- Verify environment variables in `.env`
- Check port 3000 is not in use: `lsof -i :3000`

**Database connection errors:**
- Verify database exists: `psql -U postgres -l`
- Check database credentials
- Run migrations: `node db/migrate.js`

**Timeout monitor not running:**
- Check server startup logs for "⏰ Timeout monitor started"
- Verify `node-cron` is installed: `npm list node-cron`
- Check for cron-related errors in server logs
