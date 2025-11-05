'use client'

import { useEffect, useState } from 'react'
import { helpRequests } from '@/lib/api'
import { useToast } from '@/components/Toast'

export default function PendingRequestsPage() {
  const toast = useToast()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState({})

  useEffect(() => {
    loadPendingRequests()
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadPendingRequests, 30000)
    return () => clearInterval(interval)
  }, [])

  async function loadPendingRequests() {
    try {
      const data = await helpRequests.getAll({ status: 'pending' })
      setRequests(data.data || [])
      setLoading(false)
    } catch (error) {
      console.error('Failed to load pending requests:', error)
      setLoading(false)
    }
  }

  async function handleRespond(requestId, answer) {
    if (!answer.trim()) {
      toast.info('Please provide an answer')
      return
    }

    setResponding(prev => ({ ...prev, [requestId]: true }))

    try {
      await helpRequests.respond(requestId, answer)
      // Reload pending requests after successful response
      await loadPendingRequests()
      toast.success('Response sent successfully! Knowledge base updated.')
    } catch (error) {
      console.error('Failed to respond:', error)
      toast.error(`Error: ${error.message}`)
    } finally {
      setResponding(prev => ({ ...prev, [requestId]: false }))
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading pending requests...</div>
  }

  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="text-gray-500 text-lg">No pending requests</div>
        <div className="text-gray-400 text-sm mt-2">All caught up!</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Pending Requests</h2>
        <div className="text-sm text-gray-600">
          {requests.length} pending {requests.length === 1 ? 'request' : 'requests'}
        </div>
      </div>

      <div className="space-y-4">
        {requests.map((request) => (
          <PendingRequestCard
            key={request.id}
            request={request}
            onRespond={handleRespond}
            isResponding={responding[request.id]}
          />
        ))}
      </div>
    </div>
  )
}

function PendingRequestCard({ request, onRespond, isResponding }) {
  const [answer, setAnswer] = useState('')

  // Calculate time elapsed
  const createdAt = new Date(request.created_at)
  const now = new Date()
  const minutesElapsed = Math.floor((now - createdAt) / 1000 / 60)
  const isOld = minutesElapsed > 15

  // Calculate time until timeout
  const timeoutAt = new Date(request.timeout_at)
  const minutesUntilTimeout = Math.floor((timeoutAt - now) / 1000 / 60)

  function handleSubmit(e) {
    e.preventDefault()
    onRespond(request.id, answer)
  }

  return (
    <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${isOld ? 'border-red-500' : 'border-blue-500'}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <span className="text-sm font-medium text-gray-500">
              {request.customer_phone || 'Unknown Number'}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded ${isOld ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
              {minutesElapsed}m ago
            </span>
            {minutesUntilTimeout > 0 && (
              <span className={`px-2 py-1 text-xs font-semibold rounded ${
                minutesUntilTimeout < 5
                  ? 'bg-red-100 text-red-800 border border-red-300'
                  : minutesUntilTimeout < 15
                  ? 'bg-orange-100 text-orange-800 border border-orange-300'
                  : 'bg-yellow-100 text-yellow-800 border border-yellow-300'
              }`}>
                ⏰ Timeout in {minutesUntilTimeout}m
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {new Date(request.created_at).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-sm font-semibold text-gray-700 mb-1">Customer Question:</div>
        <div className="text-base text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
          {request.question}
        </div>
      </div>

      {request.agent_confidence && (
        <div className="text-xs text-gray-500 mb-4">
          Agent Confidence: {(request.agent_confidence * 100).toFixed(1)}%
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor={`answer-${request.id}`} className="block text-sm font-semibold text-gray-700 mb-1">
            Your Answer:
          </label>
          <textarea
            id={`answer-${request.id}`}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows="4"
            placeholder="Type your response to the customer..."
            disabled={isResponding}
            required
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            This will update the knowledge base and notify the customer
          </div>
          <button
            type="submit"
            disabled={isResponding || !answer.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isResponding ? 'Sending...' : 'Send Response'}
          </button>
        </div>
      </form>
    </div>
  )
}
