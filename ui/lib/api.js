const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Helper function for fetch with error handling
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

// Help Requests API
export const helpRequests = {
  // Get all help requests with optional filters
  getAll: async ({ status, limit = 50, offset = 0 } = {}) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (limit) params.append('limit', limit);
    if (offset) params.append('offset', offset);

    return fetchAPI(`/help-requests?${params.toString()}`);
  },

  // Get single help request
  getById: async (id) => {
    return fetchAPI(`/help-requests/${id}`);
  },

  // Get statistics
  getStats: async () => {
    return fetchAPI('/help-requests/stats');
  },

  // Create new help request (used by agent)
  create: async (data) => {
    return fetchAPI('/help-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Supervisor responds to request
  respond: async (id, answer) => {
    return fetchAPI(`/help-requests/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ answer }),
    });
  },

  // Manually trigger timeout processing
  processTimeouts: async () => {
    return fetchAPI('/help-requests/process-timeouts', {
      method: 'POST',
    });
  },
};

// Knowledge Base API
export const knowledgeBase = {
  // Get all knowledge entries
  getAll: async ({ limit = 100, offset = 0, active_only = true, learned_only = false } = {}) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit);
    if (offset) params.append('offset', offset);
    if (active_only !== undefined) params.append('active_only', active_only);
    if (learned_only) params.append('learned_only', learned_only);

    return fetchAPI(`/knowledge-base?${params.toString()}`);
  },

  // Get single knowledge entry
  getById: async (id) => {
    return fetchAPI(`/knowledge-base/${id}`);
  },

  // Search knowledge base
  search: async (query) => {
    const params = new URLSearchParams({ q: query });
    return fetchAPI(`/knowledge-base/search?${params.toString()}`);
  },

  // Get statistics
  getStats: async () => {
    return fetchAPI('/knowledge-base/stats');
  },

  // Create new knowledge entry
  create: async (data) => {
    return fetchAPI('/knowledge-base', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update knowledge entry
  update: async (id, data) => {
    return fetchAPI(`/knowledge-base/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Delete (soft delete) knowledge entry
  delete: async (id) => {
    return fetchAPI(`/knowledge-base/${id}`, {
      method: 'DELETE',
    });
  },
};
