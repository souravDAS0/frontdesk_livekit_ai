"use client";

import { useEffect, useState } from "react";
import { helpRequests } from "@/lib/api";

export default function RequestHistoryPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, resolved, timeout
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadRequests();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadRequests, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  async function loadRequests() {
    try {
      const params = filter === "all" ? {} : { status: filter };
      const data = await helpRequests.getAll(params);
      setRequests(data.data || []);
      setLoading(false);
    } catch (error) {
      console.error("Failed to load request history:", error);
      setLoading(false);
    }
  }

  // Filter requests by search query
  const filteredRequests = requests.filter((request) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      request.question?.toLowerCase().includes(query) ||
      request.customer_phone?.toLowerCase().includes(query) ||
      request.supervisor_response?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return <div className="text-center py-8">Loading request history...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">Request History</h2>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <FilterButton
              active={filter === "all"}
              onClick={() => setFilter("all")}
            >
              All
            </FilterButton>
            <FilterButton
              active={filter === "resolved"}
              onClick={() => setFilter("resolved")}
            >
              Resolved
            </FilterButton>
            <FilterButton
              active={filter === "unresolved"}
              onClick={() => setFilter("unresolved")}
            >
              Unresolved
            </FilterButton>
          </div>

          <div>
            <input
              type="text"
              placeholder="Search by phone, question, or answer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="text-sm text-gray-600 mb-2">
        Showing {filteredRequests.length}{" "}
        {filteredRequests.length === 1 ? "request" : "requests"}
      </div>

      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-500">No requests found</div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <RequestHistoryCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-md font-medium transition-colors ${
        active
          ? "bg-blue-600 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

function RequestHistoryCard({ request }) {
  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-500",
    resolved: "bg-green-100 text-green-800 border-green-500",
    unresolved: "bg-red-100 text-red-800 border-red-500",
  };

  const statusLabels = {
    pending: "Pending",
    resolved: "Resolved",
    unresolved: "Unresolved",
  };

  return (
    <div
      className={`bg-white rounded-lg shadow p-6 border-l-4 ${
        statusColors[request.status]
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <span className="text-sm font-medium text-gray-900">
              {request.customer_phone || "Unknown Number"}
            </span>
            <span
              className={`px-3 py-1 text-xs font-semibold rounded-full ${
                statusColors[request.status]
              }`}
            >
              {statusLabels[request.status]}
            </span>
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <div>Created: {new Date(request.created_at).toLocaleString()}</div>
            {request.resolved_at && (
              <div>
                Resolved: {new Date(request.resolved_at).toLocaleString()}
              </div>
            )}
            {request.status === "unresolved" && request.timeout_at && (
              <div>
                Marked unresolved:{" "}
                {new Date(request.timeout_at).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-1">
            Question:
          </div>
          <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
            {request.question}
          </div>
        </div>

        {request.supervisor_response && (
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-1">
              Supervisor Response:
            </div>
            <div className="text-sm text-gray-900 bg-green-50 p-3 rounded border border-green-200">
              {request.supervisor_response}
            </div>
          </div>
        )}

        {request.status === "unresolved" && !request.supervisor_response && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
            This request timed out and was marked as unresolved without
            receiving a supervisor response.
          </div>
        )}
      </div>

      {request.call_id && (
        <div className="mt-3 text-xs text-gray-400">
          Call ID: {request.call_id}
        </div>
      )}
    </div>
  );
}
