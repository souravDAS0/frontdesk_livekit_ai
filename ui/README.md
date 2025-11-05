# Frontdesk Supervisor UI

Next.js-based supervisor dashboard for managing the Frontdesk AI receptionist system.

## Features

- **Dashboard**: Overview with statistics on pending, resolved, and unresolved requests
- **Pending Requests**: View and respond to customer questions escalated by the AI agent
- **Request History**: Browse all requests with filters (All, Resolved, Unresolved, Pending)
- **Knowledge Base**: Manage all Q&A entries with edit and delete capabilities
- **Learned Answers**: View entries that were learned from supervisor responses
- **Auto-refresh**: All views poll the API every 30 seconds for real-time updates

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Backend API server running on port 3000

### Installation

```bash
npm install
```

### Configuration

The UI is configured via `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### Running the Development Server

```bash
npm run dev
```

The supervisor dashboard will be available at [http://localhost:3001](http://localhost:3001)

### Building for Production

```bash
npm run build
npm start
```

## Usage

### Responding to Pending Requests

1. Navigate to "Pending Requests"
2. Review the customer question
3. Type your answer in the response form
4. Click "Send Response"
5. The system will:
   - Mark the request as resolved
   - Add the Q&A to the knowledge base
   - Simulate calling the customer back (console log)

### Managing Knowledge Base

1. Navigate to "Knowledge Base"
2. View all Q&A entries (seeded + learned)
3. Click "Edit" to modify an entry
4. Click "Delete" to remove an entry (soft delete)
5. Click "Add New Entry" to manually add knowledge

### Viewing Learned Answers

1. Navigate to "Learned Answers"
2. See only entries that were learned from supervisor responses
3. Click "View Source Request" to see the original customer question
4. Edit or delete learned entries as needed

## Architecture

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS
- **API Client**: Custom fetch-based client in `lib/api.js`
- **Polling**: 30-second intervals for real-time updates
- **State Management**: React hooks (useState, useEffect)

## Key Files

- `app/layout.js` - Main layout with navigation
- `app/page.js` - Dashboard with statistics
- `app/pending/page.js` - Pending requests queue
- `app/history/page.js` - Request history with filters
- `app/knowledge/page.js` - Knowledge base management
- `app/learned/page.js` - Learned answers view
- `lib/api.js` - API client functions

## Status Values

- **pending**: Awaiting supervisor response
- **resolved**: Supervisor responded, customer notified
- **unresolved**: Request timed out without supervisor response

## Notes

- The UI is intentionally simple and functional (internal admin panel)
- All timestamps are displayed in local timezone
- Requests older than 15 minutes are highlighted in red
- The timeout monitor runs every minute on the backend
