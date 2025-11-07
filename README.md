# Frontdesk AI Supervisor

A production-ready human-in-the-loop AI receptionist system that allows voice AI agents to escalate unknown questions to human supervisors, learn from their responses, and improve over time.

## Project Overview

This system enables AI voice agents to provide intelligent customer service while gracefully handling uncertainty. When the AI doesn't know an answer with sufficient confidence, it escalates to human supervisors, learns from their responses, and builds knowledge over time.

### Key Features

- **AI Voice Agent** - Production-ready LiveKit Python agent with multi-tier confidence matching
- **Smart Escalation** - Three-tier confidence system (high/medium/low) with intelligent fallback
- **Semantic Search** - Two-tier knowledge base matching using direct questions and semantic tags
- **Supervisor Dashboard** - Real-time Next.js dashboard for managing help requests
- **Knowledge Base Learning** - Automatically learns from supervisor responses with full-text search
- **Timeout Handling** - Background cron job gracefully handles unresponsive supervisors
- **Real-time Updates** - Auto-refresh dashboard every 30 seconds
- **Voice Integration** - Ready for deployment with LiveKit and Twilio integration

## Architecture Overview

```
┌─────────────┐      ┌──────────────────┐      ┌──────────────┐
│   Customer  │─────▶│  LiveKit Python  │─────▶│   Backend    │
│  (Voice)    │◀─────│  Agent (Priya)   │◀─────│  API (Node)  │
│   Twilio    │      │  (Local/Cloud)   │      │  Port 3000   │
└─────────────┘      └──────────────────┘      └──────┬───────┘
                                                       │
                                                       │
                                                       │
                     ┌─────────────┐                   │
                     │  Supervisor │◀──────────────────┤
                     │  Dashboard  │                   │
                     │   Next.js   │                   │
                     │  Port 3001  │                   │
                     └─────────────┘                   │
                                                       │
                                                 ┌─────▼──────┐
                                                 │ PostgreSQL │
                                                 │  Database  │
                                                 │  pg_trgm   │
                                                 └────────────┘
```

## System Flow

### 1. Customer Calls (via Twilio)

- Customer dials your configured phone number
- Twilio SIP trunk routes to LiveKit
- AI agent "Priya" from "Priya's Beauty Lounge" answers

### 2. Knowledge Base Check (Two-Tier Matching)

- **Tier 1**: Direct question match using PostgreSQL full-text search
- **Tier 2**: Semantic tag extraction via OpenAI GPT-4o-mini
- Confidence levels: HIGH (>0.8), MEDIUM (0.5-0.8), LOW (<0.5)
- Prefers specific answers over generic ones

### 3. Decision Logic

- **High Confidence**: Answer immediately
- **Medium Confidence**: Answer with qualifier ("I believe...")
- **Low Confidence**: Escalate to supervisor

### 4. Escalation Flow

- Agent: "Let me check with my supervisor and get back to you"
- Creates help request in PostgreSQL
- Simulated notification to supervisor (console log)
- Gracefully ends call

### 5. Supervisor Response

- Supervisor sees request in real-time dashboard
- Submits answer via UI
- Answer automatically added to knowledge base
- Simulated callback to customer (console log)

### 6. Future Calls

- Same question detected via semantic matching
- Immediate high-confidence answer
- No supervisor escalation needed

### 7. Timeout Handling

- Background cron job runs every minute
- Checks for requests older than 30 minutes
- Marks as "unresolved" status
- Supervisor notified of missed requests

## Tech Stack

### Backend API

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL 14+ with pg_trgm extension
- **Background Jobs**: node-cron for timeout monitoring
- **Connection Pooling**: pg-pool (20 connections)
- **Port**: 3000

### LiveKit Voice Agent

- **Language**: Python 3.13
- **Package Manager**: UV (fast Python package installer)
- **SDK**: LiveKit Agents SDK ~1.2
- **STT**: Deepgram Nova-3 (Speech-to-Text)
- **LLM**: Google Gemini 2.5 Flash
- **TTS**: ElevenLabs Flash V2 (Text-to-Speech)
- **VAD**: Silero Voice Activity Detection
- **Semantic Extraction**: OpenAI GPT-4o-mini
- **Features**: Noise cancellation, console mode

### Supervisor UI

- **Framework**: Next.js 16 with App Router
- **React**: Version 19
- **Styling**: Tailwind CSS 4
- **Components**: Radix UI (Dialog, Toast)
- **Port**: 3001
- **Auto-refresh**: Every 30 seconds

### Infrastructure

- **Database**: PostgreSQL with uuid-ossp and pg_trgm extensions
- **Agent Deployment**: LiveKit (local or cloud via livekit-cli)
- **Telephony**: Twilio SIP trunk (optional for production)
- **Containerization**: Docker support for agent

## Why Python SDK for LiveKit Agent?

The LiveKit voice agent is built with the **Python SDK** instead of Node.js for one critical reason:

### Console Mode Support

The Python SDK provides a **console mode** for local development and testing:

```bash
# Interactive console testing (NOT available in Node.js SDK)
uv run agent.py console
```

This allows you to:

- Test agent logic without making phone calls
- Debug conversation flows interactively
- Iterate quickly during development
- Save on telephony costs during testing

The Node.js SDK does not provide this console functionality, making Python the superior choice for development velocity and cost-effective testing.

## Project Structure

```
frontdesk_assignment/
├── backend/                          # Node.js Express API (Port 3000)
│   ├── server.js                     # Main Express server
│   ├── routes/
│   │   ├── helpRequests.js          # Help request endpoints
│   │   └── knowledgeBase.js         # Knowledge base CRUD
│   ├── services/
│   │   ├── helpRequestService.js    # Help request business logic
│   │   └── knowledgeService.js      # KB search and matching
│   ├── db/
│   │   ├── pool.js                  # PostgreSQL connection pool
│   │   ├── migrations/              # Database schema migrations
│   │   │   └── 001_initial_schema.sql
│   │   └── seeds/                   # Sample salon Q&A data
│   │       └── seed.sql
│   ├── .env.example                 # Backend environment template
│   └── package.json
│
├── livekit-voice-agent/             # Python LiveKit Agent
│   ├── agent.py                     # Main agent entry point
│   ├── tool.py                      # Agent tools (KB, escalation)
│   ├── prompt.py                    # Agent prompt configuration
│   ├── pyproject.toml               # UV dependencies
│   ├── Dockerfile                   # Docker deployment config
│   ├── livekit.toml                 # LiveKit configuration
│   └── .env.local.example           # Agent environment template
│
├── ui/                              # Next.js Supervisor Dashboard (Port 3001)
│   ├── app/
│   │   ├── layout.js                # Root layout
│   │   ├── page.js                  # Dashboard home
│   │   ├── pending/page.js          # Pending requests queue
│   │   ├── history/page.js          # Request history
│   │   ├── knowledge/page.js        # Knowledge base manager
│   │   └── learned/page.js          # Learned answers view
│   ├── components/
│   │   ├── ui/                      # Radix UI components
│   │   ├── PendingRequestCard.jsx   # Request response form
│   │   ├── RequestHistoryTable.jsx  # History with filters
│   │   └── KnowledgeBaseTable.jsx   # KB CRUD interface
│   ├── .env.local.example           # UI environment template
│   └── package.json
│
├── SETUP.md                         # Database setup guide
├── QUICK_START.md                   # Quick testing guide
├── PROJECT_STATUS.md                # Implementation checklist
└── README.md                        # This file
```

## Component Deep Dive

### Backend API (Node.js/Express)

**Key Features:**

- RESTful API with comprehensive error handling
- Help request lifecycle management (pending → resolved/unresolved)
- Knowledge base with full-text search using PostgreSQL `pg_trgm`
- Semantic tag extraction integration
- Background timeout monitoring via node-cron (runs every minute)
- Automatic audit trail via database triggers
- Connection pooling for high concurrency
- Simulated notifications (console logs, extensible to Twilio/email)

**API Endpoints:**

_Help Requests:_

- `GET /api/help-requests` - List all requests (filterable by status)
- `GET /api/help-requests/stats` - Request statistics
- `POST /api/help-requests` - Create new help request (called by agent)
- `POST /api/help-requests/:id/respond` - Supervisor responds

_Knowledge Base:_

- `GET /api/knowledge` - List all knowledge entries
- `GET /api/knowledge/stats` - Usage statistics
- `POST /api/knowledge/search` - Search with semantic matching
- `POST /api/knowledge` - Add new entry
- `PATCH /api/knowledge/:id` - Update entry
- `DELETE /api/knowledge/:id` - Soft delete (sets is_active=false)

**Database Schema:**

```sql
-- Help Requests (Escalated Questions)
CREATE TABLE help_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_phone VARCHAR(20) NOT NULL,
  question TEXT NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'resolved', 'unresolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  timeout_at TIMESTAMP WITH TIME ZONE,
  supervisor_response TEXT,
  call_id VARCHAR(100),

  -- Constraints
  CONSTRAINT valid_status CHECK (
    (status = 'pending' AND resolved_at IS NULL AND supervisor_response IS NULL) OR
    (status = 'resolved' AND resolved_at IS NOT NULL AND supervisor_response IS NOT NULL) OR
    (status = 'unresolved' AND timeout_at IS NOT NULL)
  )
);

-- Knowledge Base (Learned Q&A)
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_pattern TEXT NOT NULL UNIQUE,
  answer TEXT NOT NULL,
  learned_from_request_id UUID REFERENCES help_requests(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  times_used INTEGER DEFAULT 0,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  tags TEXT[]
);

-- Audit Trail (Auto-populated by triggers)
CREATE TABLE request_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
  previous_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  changed_by VARCHAR(100),
  notes TEXT
);
```

**Indexes for Performance:**

```sql
CREATE INDEX idx_help_requests_status ON help_requests(status);
CREATE INDEX idx_help_requests_created ON help_requests(created_at DESC);
CREATE INDEX idx_help_requests_timeout ON help_requests(timeout_at)
  WHERE status = 'pending';

CREATE INDEX idx_kb_active ON knowledge_base(is_active)
  WHERE is_active = true;
CREATE INDEX idx_kb_question_trgm ON knowledge_base
  USING gin(question_pattern gin_trgm_ops);
```

### LiveKit Voice Agent (Python)

**Agent Persona:**

- Name: **Priya**
- Business: **Priya's Beauty Lounge**
- Personality: Warm, professional, helpful
- Role: AI receptionist handling customer inquiries

**Key Features:**

- Three-tier confidence matching (HIGH/MEDIUM/LOW)
- Two-tier knowledge base search:
  1. Direct question matching via PostgreSQL full-text search
  2. Semantic tag extraction using OpenAI GPT-4o-mini
- Preference for specific answers over generic ones
- Graceful escalation with friendly messaging
- Noise cancellation for clear audio
- Voice Activity Detection for natural conversations

**Agent Tools:**

1. **check_knowledge_base(question: str)**

   - Queries backend API `/api/knowledge/search`
   - Returns confidence score (0.0-1.0)
   - Returns matched answer or None
   - Logs confidence tier (HIGH/MEDIUM/LOW)

2. **create_help_request(question: str)**

   - Posts to backend API `/api/help-requests`
   - Includes customer context (phone, name if available)
   - Returns request ID for tracking
   - Triggers supervisor notification

3. **end_call()**
   - Gracefully terminates conversation
   - Friendly goodbye message
   - Logs call metrics

**Running Modes:**

```bash
# Console mode - Interactive testing (no phone calls needed)
cd livekit-voice-agent
uv run agent.py console

# Development mode - Connect to LiveKit room for testing
uv run agent.py dev

# Production mode - Connect to LiveKit Cloud
uv run agent.py start
```

**Deployment:**

The agent can be deployed to **LiveKit Cloud** using the official `livekit-cli`:

```bash
# Deploy to LiveKit Cloud (optional)
lk agent create

# Deploy new versions
lk agent deploy

# Based on: https://docs.livekit.io/agents/ops/deployment/
```

**Technology Choices:**

- **Deepgram Nova-3**: Fast, accurate speech recognition
- **Google Gemini 2.5 Flash**: Conversational AI with low latency
- **ElevenLabs Flash V2**: Natural-sounding text-to-speech
- **Silero VAD**: Precise voice activity detection
- **OpenAI GPT-4o-mini**: Semantic tag extraction (cost-effective)

### Supervisor UI (Next.js 16)

**Key Features:**

- Real-time dashboard with statistics
- Pending requests queue with inline response form
- Request history with filters (All, Resolved, Unresolved, Pending)
- Knowledge base management (view, edit, delete, add)
- Learned answers view (entries created from supervisor responses)
- Auto-refresh every 30 seconds
- Request age highlighting (red for >15 minutes old)
- Toast notifications for user feedback

**Pages:**

1. **Dashboard (/)** - Statistics overview

   - Total requests
   - Pending count
   - Average resolution time
   - Knowledge base size

2. **Pending Requests (/pending)** - Response queue

   - List of unanswered questions
   - Customer information (phone, name)
   - Timestamp with age highlighting
   - Inline response form
   - One-click submit

3. **Request History (/history)** - All requests

   - Filterable by status
   - Search functionality
   - Pagination
   - Resolution timestamps

4. **Knowledge Base (/knowledge)** - KB manager

   - View all Q&A pairs
   - Edit answers inline
   - Delete entries (soft delete)
   - Add new knowledge manually
   - Usage statistics (times_used)

5. **Learned Answers (/learned)** - Supervisor contributions
   - Shows KB entries learned from help requests
   - Links back to originating request
   - Tracks supervisor impact

**UI Implementation:**

- Simple, functional design (internal tool)
- Radix UI components for accessibility
- Tailwind CSS for rapid styling
- Client-side state management
- Optimistic updates for better UX

## Prerequisites

### Required Software

1. **Node.js 18+** and npm

   ```bash
   node --version  # Should be 18.x or higher
   npm --version
   ```

2. **PostgreSQL 14+**

   ```bash
   postgres --version  # Should be 14.x or higher
   ```

3. **Python 3.13+**

   ```bash
   python3 --version  # Should be 3.13.x or higher
   ```

4. **UV Package Manager** (for Python agent)
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   uv --version
   ```

### Required Accounts & API Keys

1. **LiveKit Cloud Account**

   - Sign up at [livekit.io](https://livekit.io)
   - Create a project
   - Note your API Key, API Secret, and WebSocket URL

2. **OpenAI API Key** (for semantic tag extraction)

   - Sign up at [platform.openai.com](https://platform.openai.com)
   - Create API key for GPT-4o-mini access


3. **(Optional) Twilio Account** (for production phone calls)
   - Sign up at [twilio.com](https://twilio.com)
   - Configure SIP trunk for LiveKit

## Complete Setup Instructions

### 1. Clone Repository

```bash
git clone <repository-url>
cd frontdesk_assignment
```

### 2. PostgreSQL Database Setup

Choose one of three options:

#### Option A: Homebrew (macOS)

```bash
# Install PostgreSQL
brew install postgresql@14

# Start PostgreSQL service
brew services start postgresql@14

# Create database
createdb frontdesk_ai

# Verify connection
psql frontdesk_ai -c "SELECT version();"
```

#### Option B: Docker

```bash
# Run PostgreSQL in Docker
docker run --name frontdesk-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=frontdesk_ai \
  -p 5432:5432 \
  -d postgres:14

# Verify it's running
docker ps | grep frontdesk-postgres

# Access database
docker exec -it frontdesk-postgres psql -U postgres -d frontdesk_ai
```

#### Option C: Existing PostgreSQL Installation

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE frontdesk_ai;
\q
```

### 3. Enable PostgreSQL Extensions

**Critical step** - The schema requires `pg_trgm` for similarity matching:

```bash
# Connect to database
psql frontdesk_ai
```

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Verify extensions are installed
\dx

-- Expected output:
--   uuid-ossp  | 1.1  | generate UUIDs
--   pg_trgm    | 1.6  | text similarity measurement

-- Exit
\q
```

### 4. Environment Configuration

#### Backend Environment (.env in /backend)

```bash
cd backend
cp .env.example .env
# Edit .env with your values
```

**Required variables:**

```env
# Server
PORT=3000
NODE_ENV=development

# Database (adjust based on your setup)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=frontdesk_ai
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# LiveKit (not required for backend, but used by agent)
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=wss://your-project.livekit.cloud

# API Configuration
API_BASE_URL=http://localhost:3000/api

# Timeout Configuration
REQUEST_TIMEOUT_MINUTES=30
```

#### LiveKit Agent Environment (.env.local in /livekit-voice-agent)

```bash
cd ../livekit-voice-agent
cp .env.local.example .env.local
# Edit .env.local with your values
```

**Required variables:**

```env
# LiveKit Connection
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=wss://your-project.livekit.cloud

# For local testing with LiveKit Playground
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud

# Backend API
API_BASE_URL=http://localhost:3000/api

# AI Services
OPENAI_API_KEY=your_openai_api_key
```

#### UI Environment (.env.local in /ui)

```bash
cd ../ui
cp .env.local.example .env.local
# Edit .env.local with your values
```

**Required variables:**

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### 5. Install Dependencies

#### Backend

```bash
cd backend
npm install
```

#### LiveKit Agent

```bash
cd ../livekit-voice-agent
uv sync  # Installs all dependencies from pyproject.toml
```

#### UI

```bash
cd ../ui
npm install
```

### 6. Database Migration & Seeding

```bash
# From project root
cd backend

# Run migrations (creates all tables, indexes, triggers)
npm run migrate

# Optional: Seed with sample salon Q&A data
npm run seed
```

**What the migration creates:**

- `help_requests` table with status constraints
- `knowledge_base` table with full-text search indexes
- `request_history` audit table
- Database triggers for automatic history tracking
- Optimized indexes for common queries

**What the seed adds:**

- Sample salon questions and answers
- Common customer inquiries
- Test data for development

### 7. Verify Setup

```bash
# Check PostgreSQL connection
psql frontdesk_ai -c "SELECT COUNT(*) FROM knowledge_base;"

# Expected: Row count of seed data (if seeded)

# Check backend can connect
cd backend
npm test  # If tests exist

# Check agent dependencies
cd ../livekit-voice-agent
uv run agent.py --help

# Check UI builds
cd ../ui
npm run build
```

## Running the Application

You need **4 terminal windows** to run the full system:

### Terminal 1: PostgreSQL (if not running as service)

```bash
# If using Homebrew (usually auto-starts)
brew services start postgresql@14

# If using Docker
docker start frontdesk-postgres

# Verify
psql frontdesk_ai -c "SELECT NOW();"
```

### Terminal 2: Backend API

```bash
cd backend
npm start

# Server starts on http://localhost:3000
# API available at http://localhost:3000/api
# Health check: http://localhost:3000/api/health
```

**Expected output:**

```
Server running on port 3000
Connected to PostgreSQL database
Timeout monitor running every 1 minute
```

### Terminal 3: Supervisor UI

```bash
cd ui
npm run dev

# UI starts on http://localhost:3001
# Open in browser: http://localhost:3001
```

**Available pages:**

- http://localhost:3001 - Dashboard
- http://localhost:3001/pending - Pending requests
- http://localhost:3001/history - Request history
- http://localhost:3001/knowledge - Knowledge base
- http://localhost:3001/learned - Learned answers

### Terminal 4: LiveKit Voice Agent

#### Option 1: Console Mode (Recommended for testing)

```bash
cd livekit-voice-agent
uv run agent.py console

# Interactive console for testing agent logic
# Type questions to test knowledge base matching
# No phone calls required
```

#### Option 2: Development Mode (LiveKit Playground)

```bash
cd livekit-voice-agent
uv run agent.py dev

# Connects to LiveKit Cloud
# Use LiveKit Playground to test voice interaction
# Visit: https://agents-playground.livekit.io
```

#### Option 3: Production Mode (Phone Calls)

```bash
cd livekit-voice-agent
uv run agent.py start

# Connects to LiveKit Cloud
# Ready to receive phone calls via Twilio
```


## Development Workflow

### 1. Testing Locally

```bash
# Start all services (4 terminals)
Terminal 1: brew services start postgresql@14
Terminal 2: cd backend && npm start
Terminal 3: cd ui && npm run dev
Terminal 4: cd livekit-voice-agent && uv run agent.py console

# Test in console mode
> What time do you close on Sundays?
# Agent checks knowledge base
# If unknown, creates help request

# Check supervisor UI
Open http://localhost:3001/pending
# See new request, submit answer

# Test again
> What time do you close on Sundays?
# Agent now answers with high confidence
```

### 2. Testing with Voice (LiveKit Playground)

```bash
# Start agent in dev mode
cd livekit-voice-agent
uv run agent.py dev

# Open LiveKit Agents Playground
Visit: https://agents-playground.livekit.io

```

### 3. Testing with Voice (Optional Production Setup)

For production deployment with phone calls, you can optionally configure Twilio integration as described in the deployment section below.

## Deploying to LiveKit Cloud (Optional)

### 1. Install LiveKit CLI

```bash
# macOS
brew install livekit-cli

brew update && brew upgrade livekit-cli

# OR follow from https://docs.livekit.io/home/cli/

```

### 2. Configure LiveKit CLI

```bash
# Add your LiveKit project
lk cloud auth

```

### 3. Deploy Agent

```bash
cd livekit-voice-agent

# Deploy to LiveKit Cloud
lk agent create

# Monitor deployment status
lk agent status

# Tail agent logs
lk agent logs

# Deploy new versions
lk agent deploy

```

**Deployment process:**

1. Builds Docker image (see `Dockerfile`)
2. Uploads to LiveKit Cloud
3. Registers as available agent
4. Automatically handles incoming calls

**Based on official documentation:**
https://docs.livekit.io/agents/ops/deployment/

### 4. Configure Twilio (Optional for Production Phone Calls)

For production phone calls:

1. **Sign up for Twilio** at https://twilio.com
2. **Purchase a phone number**
3. **Create SIP Trunk** in Twilio console
4. **Configure LiveKit Telephony**:
   - Go to LiveKit Cloud dashboard
   - Navigate to "Telephony" section
   - Add inbound SIP trunk
   - Configure dispatch rules to route to your agent
5. **Test**: Call your Twilio number, agent should answer

## Design Decisions

### 1. Three-Tier Confidence System

Instead of a binary "know/don't know" approach, we use three confidence tiers:

- **HIGH (>0.8)**: Answer immediately with full confidence
- **MEDIUM (0.5-0.8)**: Answer with qualifier ("I believe...")
- **LOW (<0.5)**: Escalate to supervisor

This reduces unnecessary escalations while maintaining accuracy.

### 2. Two-Tier Knowledge Base Matching

**Tier 1: Direct Question Match**

- PostgreSQL full-text search using `pg_trgm`
- Fast, efficient for exact or near-exact matches
- Handles typos and minor variations

**Tier 2: Semantic Tag Extraction**

- Uses OpenAI GPT-4o-mini to extract semantic tags
- Matches based on intent, not just keywords
- Example: "When do you open tomorrow?" → tags: ["hours", "tomorrow"]
- Finds related answers even with different phrasing

### 3. Preference for Specific Answers

When multiple knowledge base entries match, the system prefers:

1. Higher confidence scores
2. More specific answers over generic ones
3. Recently updated entries
4. Frequently used answers (times_used > 0)

### 4. Graceful Timeout Handling

Rather than leaving requests pending indefinitely:

- Background cron job runs every minute
- Checks for pending requests older than timeout threshold (default 30 min)
- Marks as "unresolved" status
- Supervisor notified to follow up asynchronously
- Customer can still receive answer later

### 5. Automatic Knowledge Base Learning

When a supervisor responds to a help request:

1. Answer automatically added to knowledge base
2. Linked to originating request (learned_from_request_id)
3. Default confidence threshold: 0.70
4. Can be edited or improved by supervisor later
5. Immediately available for future calls

### 6. PostgreSQL over NoSQL

Chose PostgreSQL because:

- **ACID compliance** for request lifecycle (pending → resolved must be atomic)
- **Complex queries** for knowledge base pattern matching
- **Full-text search** with pg_trgm extension (no external search engine needed)
- **Triggers** for automatic audit trail
- **Constraints** to enforce data integrity (status must be pending/resolved/unresolved)
- **Proven scalability** for read-heavy workloads (knowledge base queries)

### 7. Python SDK for LiveKit Agent

Chose Python over Node.js for **console mode**:

```bash
# Python SDK only
uv run agent.py console
```

This enables:

- Interactive testing without phone calls
- Rapid iteration during development
- Debugging conversation flows
- Zero telephony costs during testing

Node.js SDK lacks this feature, making Python essential for efficient development.

### 8. Modular Architecture

Separated into three independent components:

- **Backend API** - Business logic, data persistence, background jobs
- **LiveKit Agent** - Voice interaction only (stateless)
- **Supervisor UI** - Presentation layer only

Benefits:

- Each component can scale independently
- Different technology stacks optimized for each role
- Easy to swap implementations (e.g., different UI framework)
- Agent can restart without affecting pending requests

## Scaling Considerations

### Current Capacity: ~10 requests/day

**Architecture:**

- Single API instance (no load balancer)
- Direct PostgreSQL queries (no caching)
- Polling-based UI updates (30-second intervals)
- Single agent instance

**Bottlenecks:**

- None expected at this volume

### Scaling to 100 requests/day

**Required changes:**

- Database connection pooling (✅ already implemented, 20 connections)
- Add indexes (✅ already implemented)
- Monitor slow queries

**Estimated capacity:**

- Current architecture supports up to ~500 requests/day

### Scaling to 1,000+ requests/day

#### Database Layer

**Optimizations:**

```sql
-- Add composite indexes for complex queries
CREATE INDEX idx_pending_timeout ON help_requests(status, timeout_at);
CREATE INDEX idx_kb_active_usage ON knowledge_base(is_active, times_used DESC);

-- Partition help_requests by created_at (monthly partitions)
CREATE TABLE help_requests_2025_01 PARTITION OF help_requests
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

**Infrastructure:**

- Increase connection pool size (50-100 connections)
- Read replicas for knowledge base queries (95% of DB traffic)
- Primary handles writes only (help requests, supervisor responses)
- Consider materialized views for dashboard statistics

#### API Layer

**Caching:**

```javascript
// Redis for knowledge base lookups (95% cache hit rate expected)
const cached = await redis.get(`kb:${questionHash}`);
if (cached) return JSON.parse(cached);

// Cache for 1 hour
await redis.setex(`kb:${questionHash}`, 3600, JSON.stringify(result));
```

**Horizontal Scaling:**

- Load balancer (nginx or AWS ALB)
- 3-5 API instances behind load balancer
- Sticky sessions not required (stateless API)
- Shared Redis for cache coherency

**Background Jobs:**

- Move timeout monitoring to separate worker process
- Use message queue (RabbitMQ or AWS SQS)
- Deduplicate timeout checks across workers

#### Agent Layer

**LiveKit Auto-Scaling:**

- LiveKit Cloud automatically scales agents
- Configure minimum instances (2-3 for availability)
- Agents are stateless, scale horizontally

**Knowledge Base Caching:**

- Agent maintains in-memory LRU cache (100 most common Q&A)
- Reduces backend API calls by 80-90%
- Update cache on supervisor responses via webhook

#### UI Layer

**Real-time Updates:**

```javascript
// Replace polling with WebSocket or Server-Sent Events
const socket = io("http://api.example.com");
socket.on("new_request", (request) => {
  // Update UI immediately
});
```

**Performance:**

- Enable Next.js caching
- CDN for static assets
- Pagination for large result sets

### Scaling to 10,000+ requests/day

- **Database**: PostgreSQL cluster with primary + multiple replicas
- **Caching**: Redis cluster for distributed caching
- **API**: Auto-scaling group (10-20 instances)
- **Search**: Elasticsearch for advanced knowledge base search
- **Monitoring**: Datadog/New Relic for performance tracking
- **CDN**: CloudFlare for global distribution

## API Documentation

### Base URL

```
http://localhost:3000/api
```

### Authentication

Currently no authentication required (internal tool). For production, add:

- API keys for agent
- Session-based auth for supervisor UI
- Role-based access control

### Help Requests Endpoints

#### Create Help Request

```http
POST /api/help-requests
Content-Type: application/json

{
  "customer_phone": "+1234567890",
  "question": "Do you offer hair coloring services?",
  "call_id": "livekit_call_abc123"
}
```

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "timeout_at": "2025-11-06T15:30:00Z",
  "created_at": "2025-11-06T15:00:00Z"
}
```

#### List Help Requests

```http
GET /api/help-requests?status=pending&limit=20&offset=0
```

**Response:**

```json
{
  "requests": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "customer_phone": "+1234567890",
      "question": "Do you offer hair coloring?",
      "status": "pending",
      "created_at": "2025-11-06T15:00:00Z",
      "timeout_at": "2025-11-06T15:30:00Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

#### Respond to Request

```http
POST /api/help-requests/550e8400-e29b-41d4-a716-446655440000/respond
Content-Type: application/json

{
  "answer": "Yes, we offer full color services starting at $75."
}
```

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "resolved",
  "resolved_at": "2025-11-06T15:05:00Z",
  "supervisor_response": "Yes, we offer full color services starting at $75.",
  "knowledge_base_entry": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "created": true
  }
}
```

#### Get Request Statistics

```http
GET /api/help-requests/stats
```

**Response:**

```json
{
  "total": 150,
  "pending": 5,
  "resolved": 140,
  "unresolved": 5,
  "avg_resolution_time_minutes": 12.5
}
```

### Knowledge Base Endpoints

#### Search Knowledge Base

```http
POST /api/knowledge/search
Content-Type: application/json

{
  "question": "What time do you close?",
  "limit": 5
}
```

**Response:**

```json
{
  "results": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "question_pattern": "What time do you close on Sundays?",
      "answer": "We close at 6 PM on Sundays.",
      "confidence": 0.85,
      "tags": ["hours", "sunday"],
      "times_used": 12
    }
  ],
  "total": 1
}
```

#### Add Knowledge Entry

```http
POST /api/knowledge
Content-Type: application/json

{
  "question_pattern": "Do you accept walk-ins?",
  "answer": "Yes, we accept walk-ins but recommend booking ahead.",
  "tags": ["appointments", "walk-in"],
  "category": "booking"
}
```

#### Update Knowledge Entry

```http
PATCH /api/knowledge/660e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "answer": "Yes, we accept walk-ins Monday-Friday. Weekends are by appointment only."
}
```

#### Delete Knowledge Entry

```http
DELETE /api/knowledge/660e8400-e29b-41d4-a716-446655440000
```

**Note:** This is a soft delete (sets `is_active = false`).

## Testing

### Manual Testing

#### Test Knowledge Base Matching

```bash
curl -X POST http://localhost:3000/api/knowledge/search \
  -H "Content-Type: application/json" \
  -d '{"question": "What time do you close on Sunday?"}'
```

#### Create Test Help Request

```bash
curl -X POST http://localhost:3000/api/help-requests \
  -H "Content-Type: application/json" \
  -d '{
    "customer_phone": "+15551234567",
    "question": "Do you offer hair extensions?",
    "call_id": "test_call_001"
  }'
```

#### Test Voice Agent (Console Mode)

```bash
cd livekit-voice-agent
uv run agent.py console

# Type questions to test:
> What time do you open?
> Do you offer manicures?
> How much is a haircut?
```

### Automated Testing

```bash
# Backend unit tests
cd backend
npm test

# Agent tests
cd livekit-voice-agent
uv run pytest

# UI tests
cd ui
npm test
```

### Integration Testing

```bash
# Start all services
# Run integration test suite
npm run test:integration
```

## Troubleshooting

### Backend Issues

#### Database Connection Failed

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions:**

- Check PostgreSQL is running: `pg_isready`
- Verify credentials in `backend/.env`
- Check firewall allows port 5432
- Test connection: `psql frontdesk_ai`

#### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Agent Issues

#### LiveKit Connection Failed

```
Error: Failed to connect to LiveKit
```

**Solutions:**

- Verify `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` in `.env.local`
- Check network connectivity to LiveKit Cloud
- Test credentials in LiveKit dashboard
- Ensure WebSocket URL starts with `wss://`

#### Agent Can't Reach Backend

```
Error: Failed to check knowledge base: ECONNREFUSED
```

**Solutions:**

- Check backend is running: `curl http://localhost:3000/api/health`
- Verify `API_BASE_URL` is set correctly in agent `.env.local`
- Check firewall allows agent to reach backend
- Ensure backend and agent are running on the same network (if testing locally)

#### Missing API Keys

```
Error: OPENAI_API_KEY not found
```

**Solutions:**

- Ensure all API keys set in `livekit-voice-agent/.env.local`
- Required keys: OpenAI, Google Gemini, Deepgram, ElevenLabs
- Verify keys are valid (not revoked)

### UI Issues

#### UI Can't Fetch Data

```
Failed to fetch: http://localhost:3000/api/help-requests
```

**Solutions:**

- Check backend is running
- Verify `NEXT_PUBLIC_API_URL` in `ui/.env.local`
- Check CORS settings in backend
- Inspect browser console for errors

#### Requests Not Refreshing

**Solutions:**

- Check auto-refresh is enabled (30-second interval)
- Force refresh: `Cmd+R` / `Ctrl+R`
- Clear browser cache
- Check backend is returning data

### PostgreSQL Issues

#### Extensions Not Installed

```
ERROR: function similarity() does not exist
```

**Solutions:**

```bash
psql frontdesk_ai
```

```sql
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
\dx  -- Verify installed
```

#### Migration Failed

```
Error: relation "help_requests" already exists
```

**Solutions:**

```bash
# Drop and recreate database
dropdb frontdesk_ai
createdb frontdesk_ai
psql frontdesk_ai < backend/db/migrations/001_initial_schema.sql
```

## Future Improvements

### Phase 2: Live Transfer

- **Real-time supervisor availability** checking
- **Put customer on hold** during live call
- **Transfer call to supervisor** if available via LiveKit
- **Fall back to async** if supervisor busy
- **Queue position** announcements

### Enhanced Features

- **Multi-language support** (Hindi, Spanish)
- **Sentiment analysis** for urgent escalations
- **Supervisor performance metrics** dashboard
- **A/B testing** for different AI prompts
- **Voice customization** per business (different personas)
- **Analytics dashboard** for call patterns and insights
- **Customer callback** preferences (time slots)
- **SMS notifications** for supervisors (Twilio integration)

### Technical Improvements

- **TypeScript migration** for better type safety
- **Comprehensive test suite** (unit, integration, e2e)
- **CI/CD pipeline** (GitHub Actions)
- **Monitoring** (Datadog, Sentry for error tracking)
- **Rate limiting** for API endpoints
- **API authentication** (JWT tokens)
- **Database backups** (automated daily backups)

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes with clear commit messages
4. Add tests for new functionality
5. Update documentation (README, inline comments)
6. Submit a pull request

## License

This project is for internal use at Frontdesk. All rights reserved.

---

## Quick Reference

### Service URLs

- **Backend API**: http://localhost:3000
- **API Health**: http://localhost:3000/api/health
- **Supervisor UI**: http://localhost:3001
- **LiveKit Playground**: https://agents-playground.livekit.io

### Common Commands

```bash
# Start all services
Terminal 1: brew services start postgresql@14
Terminal 2: cd backend && npm start
Terminal 3: cd ui && npm run dev
Terminal 4: cd livekit-voice-agent && uv run agent.py console

# Database operations
psql frontdesk_ai                           # Connect to DB
npm run migrate                              # Run migrations
npm run seed                                 # Seed data

# Agent operations
uv run agent.py console                      # Interactive testing
uv run agent.py dev                          # LiveKit dev mode
uv run agent.py start                        # Production mode

# Deployment (optional)
lk agent deploy                              # Deploy agent to LiveKit Cloud
```

### Environment Variables Summary

| Service | File                             | Port | Key Variables                            |
| ------- | -------------------------------- | ---- | ---------------------------------------- |
| Backend | `backend/.env`                   | 3000 | `DB_*`, `PORT`, `API_BASE_URL`           |
| Agent   | `livekit-voice-agent/.env.local` | -    | `LIVEKIT_*`, `API_BASE_URL`, AI API keys |
| UI      | `ui/.env.local`                  | 3001 | `NEXT_PUBLIC_API_URL`                    |

---

**Built for Frontdesk** - A human-in-the-loop AI receptionist system that learns and improves with every conversation.
