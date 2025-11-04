# Frontdesk AI Supervisor

A human-in-the-loop AI receptionist system that allows voice AI agents to escalate unknown questions to human supervisors, learn from their responses, and improve over time.

## Project Overview

This system enables AI voice agents to provide intelligent customer service while gracefully handling uncertainty. When the AI doesn't know an answer, it escalates to human supervisors, learns from their responses, and builds knowledge over time.

### Key Features

- **AI Voice Agent** - LiveKit-powered voice agent with salon business context
- **Smart Escalation** - Automatically detects uncertainty and requests human help
- **Supervisor Dashboard** - Simple UI for viewing and responding to help requests
- **Knowledge Base Learning** - Automatically learns from supervisor responses
- **Timeout Handling** - Gracefully handles cases where supervisors don't respond
- **Real-time Updates** - Supervisors see new requests as they come in

## Architecture Overview

```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│   Customer  │─────▶│  LiveKit AI  │─────▶│   Backend    │
│  (Voice)    │◀─────│    Agent     │◀─────│     API      │
└─────────────┘      └──────────────┘      └──────┬───────┘
                                                  │
                     ┌─────────────┐              │
                     │  Supervisor │◀─────────────┤
                     │     UI      │              │
                     └─────────────┘              │
                                                  │
                                            ┌──────▼───────┐
                                            │  PostgreSQL  │
                                            │   Database   │
                                            └──────────────┘
```

### System Flow

1. **Customer calls** AI agent answers with salon context
2. **AI uncertain?** "Let me check with my supervisor and get back to you"
3. **Help request created** Stored in database, supervisor notified
4. **Supervisor responds** Answer saved to knowledge base
5. **Customer callback** AI delivers answer with new knowledge
6. **Future calls** AI uses learned answer immediately

## Tech Stack

- **Voice Agent**: Node.js + LiveKit Agents SDK
- **Backend API**: Node.js + Express
- **Database**: PostgreSQL
- **Frontend**: React + Tailwind CSS
- **Real-time**: WebSockets / Server-Sent Events

## Project Structure

```
frontdesk_assignment/
├── livekit-voice-agent/    # LiveKit voice agent implementation
│   ├── index.js            # Main agent logic
│   ├── knowledge.js        # Knowledge base integration
│   └──  config.js           # Agent configuration
├── api/                    # Backend API server
│   ├── routes/
│   │   ├── help-requests.js
│   │   └── knowledge-base.js
│   ├── services/
│   │   ├── helpRequest.service.js
│   │   └── knowledge.service.js
│   └── server.js
├── db/
│  ├── migrations/         # Database schema migrations
│   └── seeds/              # Sample data for testing
├── ui/                     # React supervisor dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── PendingRequests.jsx
│   │   │   ├── RequestHistory.jsx
│   │   │   └── KnowledgeBase.jsx
│   │   └── App.jsx
│   └── package.json
├── README.md
└──  package.json
```

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- LiveKit account and API credentials
- (Optional) Twilio account for SMS notifications

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd frontdesk_assignment

# Install root dependencies
npm install

# Install API dependencies
cd api
npm install
cd ..

# Install UI dependencies
cd ui
npm install
cd ..

# Install agent dependencies
cd livekit-voice-agent
uv sync
cd ..
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb frontdesk_ai

# Run migrations
npm run migrate

# (Optional) Seed with sample data
npm run seed
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```bash
# Database
DATABASE_URL=postgresql://localhost:5432/frontdesk_ai

# LiveKit Credentials
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
LIVEKIT_URL=wss://your-project.livekit.cloud

# API Configuration
API_PORT=3001
API_HOST=localhost

# (Optional) Twilio for SMS
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Request Timeout (minutes)
HELP_REQUEST_TIMEOUT=30
```

### 4. Running the Application

```bash
# Terminal 1: Start the database
# (Already running if PostgreSQL is installed as a service)

# Terminal 2: Start the API server
cd api
npm run dev

# Terminal 3: Start the supervisor UI
cd ui
npm run dev

# Terminal 4: Start the LiveKit voice agent
cd livekit-voice-agent
npm run dev
```

The services will be available at:

- API: `http://localhost:3001`
- UI: `http://localhost:5173`
- Voice Agent: Connected to LiveKit cloud

## Database Schema

### Help Requests Table

```sql
CREATE TABLE help_requests (
  id UUID PRIMARY KEY,
  customer_phone VARCHAR(20),
  question TEXT NOT NULL,
  status VARCHAR(20) CHECK (status IN ('pending', 'resolved', 'timeout')),
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  timeout_at TIMESTAMP,
  supervisor_response TEXT,
  call_id VARCHAR(100)
);
```

### Knowledge Base Table

```sql
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY,
  question_pattern TEXT NOT NULL,
  answer TEXT NOT NULL,
  learned_from_request_id UUID REFERENCES help_requests(id),
  created_at TIMESTAMP DEFAULT NOW(),
  times_used INTEGER DEFAULT 0
);
```

## API Endpoints

### Help Requests

- `POST /api/help-requests` - Create new help request
- `GET /api/help-requests` - List all help requests (with filters)
- `GET /api/help-requests/:id` - Get specific help request
- `POST /api/help-requests/:id/respond` - Supervisor responds to request
- `POST /api/help-requests/:id/timeout` - Mark request as timed out

### Knowledge Base

- `GET /api/knowledge-base` - List all learned Q&A pairs
- `POST /api/knowledge-base` - Add new knowledge entry
- `PUT /api/knowledge-base/:id` - Update knowledge entry
- `GET /api/knowledge-base/search?q=query` - Search knowledge base

## Design Decisions

### 1. Request Lifecycle State Machine

- **Pending** Initial state when help is requested
- **Resolved** Supervisor provided an answer
- **Timeout** No response within configured time window

### 2. Knowledge Base Pattern Matching

Using fuzzy text matching to determine if a new question is similar to previously answered ones. This allows the AI to handle slight variations in phrasing.

### 3. Timeout Handling

A background job checks for pending requests older than the configured timeout period and marks them as timed out. The system can then notify the customer that the answer will be provided later.

### 4. PostgreSQL vs NoSQL

Chose PostgreSQL for:

- Strong consistency requirements for request lifecycle
- Complex queries for knowledge base pattern matching
- ACID compliance for supervisor response handling
- Full-text search capabilities

### 5. Modular Architecture

Separated concerns into:

- **Agent** - Voice interaction logic only
- **API** - Business logic and orchestration
- **UI** - Presentation layer
- **Database** - Data persistence

This allows each component to scale independently.

## Scaling Considerations

### Current Capacity: ~10 requests/day

Simple polling, single API instance, basic database indexing.

### Scaling to 1,000+ requests/day

**Database:**

- Add indexes on frequently queried fields (status, created_at)
- Implement connection pooling (pg-pool)
- Consider read replicas for knowledge base queries
- Optimize full-text search with PostgreSQL indexes

**API:**

- Horizontal scaling with load balancer
- Redis caching for knowledge base lookups
- Message queue (RabbitMQ/Redis) for asynchronous processing
- Separate worker processes for timeout monitoring

**Agent:**

- Multiple LiveKit agent instances
- Load distribution across agent pool
- Shared knowledge base cache

**Real-time Updates:**

- Switch from polling to WebSockets or Server-Sent Events
- Use Redis pub/sub for multi-instance coordination

## Testing

```bash
# Run API tests
cd api
npm test

# Run UI tests
cd ui
npm test

# Run agent tests
cd livekit-voice-agent
npm test

# Run integration tests
npm run test:integration
```

## Demo Scenarios

### Scenario 1: Unknown Question (Happy Path)

1. Customer calls and asks "Do you offer hair coloring?"
2. AI doesn't know "Let me check with my supervisor and get back to you"
3. Supervisor sees request in dashboard, responds "Yes, we offer full color services starting at $75"
4. System calls customer back with answer
5. Knowledge base now contains this Q&A

### Scenario 2: Known Question (No Escalation)

1. Another customer asks "Do you do hair coloring?"
2. AI recognizes similar question from knowledge base
3. AI responds immediately: "Yes, we offer full color services starting at $75"
4. No supervisor escalation needed

### Scenario 3: Timeout

1. Customer asks "Can I bring my pet to the appointment?"
2. AI escalates to supervisor
3. Supervisor doesn't respond within 30 minutes
4. Request marked as timed out
5. System notifies supervisor of missed request

## Future Improvements

### Phase 2: Live Transfer

- Put customer on hold during live call
- Transfer to supervisor if available
- Fall back to async flow if supervisor busy

### Enhanced Features

- Multi-language support
- Sentiment analysis for urgent escalations
- Supervisor performance metrics
- A/B testing for different AI prompts
- Voice customization per business
- Analytics dashboard for call patterns

### Technical Improvements

- GraphQL API for more flexible queries
- TypeScript for better type safety
- Docker containerization
- CI/CD pipeline
- Automated testing suite
- Monitoring and alerting (Datadog, Sentry)

## Troubleshooting

### Agent Won't Connect to LiveKit

- Check `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET`
- Verify network connectivity to LiveKit cloud
- Check LiveKit dashboard for agent status

### Database Connection Errors

- Ensure PostgreSQL is running: `pg_isready`
- Verify `DATABASE_URL` is correct
- Check database user permissions

### UI Not Showing New Requests

- Check browser console for errors
- Verify API is running and accessible
- Check network tab for failed API calls
- Ensure polling interval is reasonable (10-30s)

## Contributing

1. Create a feature branch
2. Make your changes with clear commit messages
3. Add tests for new functionality
4. Update documentation as needed
5. Submit a pull request



---

**Note**: This is an internal tool for Frontdesk. Keep it simple, functional, and reliable.
