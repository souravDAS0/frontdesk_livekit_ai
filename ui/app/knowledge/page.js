'use client'

import { useEffect, useState } from 'react'
import { knowledgeBase } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { ConfirmDialog } from '@/components/ConfirmDialog'

export default function KnowledgeBasePage() {
  const toast = useToast()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [entryToDelete, setEntryToDelete] = useState(null)

  useEffect(() => {
    loadKnowledgeBase()
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadKnowledgeBase, 30000)
    return () => clearInterval(interval)
  }, [])

  async function loadKnowledgeBase() {
    try {
      const data = await knowledgeBase.getAll({ active_only: true })
      setEntries(data.data || [])
      setLoading(false)
    } catch (error) {
      console.error('Failed to load knowledge base:', error)
      setLoading(false)
    }
  }

  async function handleUpdate(id, updates) {
    try {
      await knowledgeBase.update(id, updates)
      await loadKnowledgeBase()
      setEditingId(null)
      toast.success('Knowledge entry updated successfully')
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
      await loadKnowledgeBase()
      toast.success('Knowledge entry deleted successfully')
    } catch (error) {
      console.error('Failed to delete entry:', error)
      toast.error(`Error: ${error.message}`)
    } finally {
      setEntryToDelete(null)
    }
  }

  async function handleAdd(data) {
    try {
      await knowledgeBase.create(data)
      await loadKnowledgeBase()
      setShowAddForm(false)
      toast.success('Knowledge entry added successfully')
    } catch (error) {
      console.error('Failed to add entry:', error)
      toast.error(`Error: ${error.message}`)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading knowledge base...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Knowledge Base</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
        >
          {showAddForm ? 'Cancel' : 'Add New Entry'}
        </button>
      </div>

      {showAddForm && (
        <AddEntryForm onSubmit={handleAdd} onCancel={() => setShowAddForm(false)} />
      )}

      <div className="text-sm text-gray-600">
        {entries.length} {entries.length === 1 ? 'entry' : 'entries'} in knowledge base
      </div>

      {entries.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-500">No knowledge entries found</div>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <KnowledgeEntryCard
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
        title="Delete Knowledge Entry"
        message="Are you sure you want to delete this knowledge entry? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}

function AddEntryForm({ onSubmit, onCancel }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [tags, setTags] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit({
      question_pattern: question,
      answer: answer,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-blue-50 rounded-lg shadow p-6 border-2 border-blue-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Knowledge Entry</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Question Pattern
          </label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., What time do you open?"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Answer
          </label>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
            placeholder="e.g., We open at 9 AM Monday through Friday"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tags (comma-separated, optional)
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., hours, schedule, opening"
          />
        </div>
        <div className="flex space-x-3">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Add Entry
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  )
}

function KnowledgeEntryCard({ entry, isEditing, onEdit, onCancelEdit, onUpdate, onDelete }) {
  const [question, setQuestion] = useState(entry.question_pattern)
  const [answer, setAnswer] = useState(entry.answer)

  function handleUpdate(e) {
    e.preventDefault()
    onUpdate(entry.id, {
      question_pattern: question,
      answer: answer,
    })
  }

  const isLearned = entry.learned_from_request_id !== null

  return (
    <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${isLearned ? 'border-green-500' : 'border-gray-300'}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            {isLearned && (
              <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded">
                Learned
              </span>
            )}
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
        <div className="space-y-2">
          <div>
            <div className="text-sm font-semibold text-gray-700">Q:</div>
            <div className="text-sm text-gray-900">{entry.question_pattern}</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-700">A:</div>
            <div className="text-sm text-gray-900">{entry.answer}</div>
          </div>
        </div>
      )}

      <div className="mt-3 text-xs text-gray-400">
        Created: {new Date(entry.created_at).toLocaleString()}
      </div>
    </div>
  )
}
