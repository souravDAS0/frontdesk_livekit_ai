'use client'

import { useEffect, useState } from 'react'
import { knowledgeBase } from '@/lib/api'
import Link from 'next/link'
import { useToast } from '@/components/Toast'
import { ConfirmDialog } from '@/components/ConfirmDialog'

export default function LearnedAnswersPage() {
  const toast = useToast()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [entryToDelete, setEntryToDelete] = useState(null)

  useEffect(() => {
    loadLearnedAnswers()
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadLearnedAnswers, 30000)
    return () => clearInterval(interval)
  }, [])

  async function loadLearnedAnswers() {
    try {
      // Get all knowledge base entries
      const data = await knowledgeBase.getAll({ active_only: true })
      // Filter for entries that were learned from requests (not seeded)
      const learned = (data.data || []).filter(
        entry => entry.learned_from_request_id !== null
      )
      setEntries(learned)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load learned answers:', error)
      setLoading(false)
    }
  }

  async function handleUpdate(id, updates) {
    try {
      await knowledgeBase.update(id, updates)
      await loadLearnedAnswers()
      setEditingId(null)
      toast.success('Learned answer updated successfully')
    } catch (error) {
      console.error('Failed to update entry:', error)
      toast.error(`Error: ${error.message}`)
    }
  }

  function openDeleteDialog(id) {
    setEntryToDelete(id)
    setDeleteDialogOpen(true)
  }

  async function confirmDelete() {
    if (!entryToDelete) return

    try {
      await knowledgeBase.delete(entryToDelete)
      await loadLearnedAnswers()
      toast.success('Learned answer deleted successfully')
    } catch (error) {
      console.error('Failed to delete entry:', error)
      toast.error(`Error: ${error.message}`)
    } finally {
      setEntryToDelete(null)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading learned answers...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Learned Answers</h2>
        <Link
          href="/knowledge"
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          View All Knowledge
        </Link>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">About Learned Answers</h3>
            <p className="mt-1 text-sm text-blue-700">
              These are knowledge entries that the AI agent learned from supervisor responses to customer questions.
              This shows how the system improves over time by learning from human feedback.
            </p>
          </div>
        </div>
      </div>

      <div className="text-sm text-gray-600">
        {entries.length} {entries.length === 1 ? 'answer' : 'answers'} learned from supervisor responses
      </div>

      {entries.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-500 text-lg mb-2">No learned answers yet</div>
          <div className="text-gray-400 text-sm">
            When supervisors respond to pending requests, the AI will learn and add new entries here.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <LearnedAnswerCard
              key={entry.id}
              entry={entry}
              isEditing={editingId === entry.id}
              onEdit={() => setEditingId(entry.id)}
              onCancelEdit={() => setEditingId(null)}
              onUpdate={handleUpdate}
              onDelete={openDeleteDialog}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Delete Learned Answer"
        message="Are you sure you want to delete this learned answer? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}

function LearnedAnswerCard({ entry, isEditing, onEdit, onCancelEdit, onUpdate, onDelete }) {
  const [question, setQuestion] = useState(entry.question_pattern)
  const [answer, setAnswer] = useState(entry.answer)
  const [showSource, setShowSource] = useState(false)

  function handleUpdate(e) {
    e.preventDefault()
    onUpdate(entry.id, {
      question_pattern: question,
      answer: answer,
    })
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded">
              Learned from Request
            </span>
            <span className="text-xs text-gray-500">
              Used {entry.times_used} {entry.times_used === 1 ? 'time' : 'times'}
            </span>
          </div>
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {entry.tags.map((tag, idx) => (
                <span key={idx} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        {!isEditing && (
          <div className="flex space-x-2">
            <button
              onClick={onEdit}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(entry.id)}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleUpdate} className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Question:</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Answer:</label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              required
            />
          </div>
          <div className="flex space-x-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          <div>
            <div className="text-sm font-semibold text-gray-700">Q:</div>
            <div className="text-sm text-gray-900">{entry.question_pattern}</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-700">A:</div>
            <div className="text-sm text-gray-900">{entry.answer}</div>
          </div>

          {/* Source Request Details */}
          {entry.learned_from_request && (
            <div className="pt-3 border-t border-gray-200">
              <button
                onClick={() => setShowSource(!showSource)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                {showSource ? '▼ Hide Source Request' : '▶ View Source Request'}
              </button>

              {showSource && (
                <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200 text-xs">
                  <div className="space-y-1">
                    <div>
                      <span className="font-medium">Customer:</span> {entry.learned_from_request.customer_phone || 'Unknown'}
                    </div>
                    <div>
                      <span className="font-medium">Original Question:</span> {entry.learned_from_request.question}
                    </div>
                    <div>
                      <span className="font-medium">Asked:</span> {new Date(entry.learned_from_request.created_at).toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Resolved:</span> {new Date(entry.learned_from_request.resolved_at).toLocaleString()}
                    </div>
                    {entry.learned_from_request.call_id && (
                      <div>
                        <span className="font-medium">Call ID:</span> {entry.learned_from_request.call_id}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 text-xs text-gray-400">
        Learned: {new Date(entry.created_at).toLocaleString()}
      </div>
    </div>
  )
}
