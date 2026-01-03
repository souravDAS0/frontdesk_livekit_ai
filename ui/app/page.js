"use client";

import { useEffect, useState } from "react";
import { helpRequests, knowledgeBase } from "../lib/api";
import Link from "next/link";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    requests: { pending: 0, resolved: 0, timeout: 0, total: 0 },
    knowledge: { total: 0, learned: 0, seeded: 0, most_used: null },
    loading: true,
  });

  useEffect(() => {
    loadStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadStats() {
    try {
      const [requestStats, kbStats] = await Promise.all([
        helpRequests.getStats(),
        knowledgeBase.getStats(),
      ]);

      console.log("requestStats", requestStats);
      console.log("kbStats", kbStats);

      setStats({
        requests: requestStats.data,
        knowledge: kbStats.data,
        loading: false,
      });
    } catch (error) {
      console.error("Failed to load stats:", error);
      setStats((prev) => ({ ...prev, loading: false }));
    }
  }

  if (stats.loading) {
    return <div className="text-center py-8">Loading statistics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
        <div className="text-sm text-gray-600 flex space-x-4">
          <Link
            href="/pending"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            View Pending Requests
          </Link>
          <Link
            href="/knowledge"
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Manage Knowledge Base
          </Link>
        </div>
      </div>

      {/* Help Requests Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Help Requests
        </h3>
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label="Pending"
            value={stats.requests.pending_count}
            color="yellow"
            link="/pending"
          />
          <StatCard
            label="Resolved"
            value={stats.requests.resolved_count}
            color="green"
          />
          <StatCard
            label="Unresolved"
            value={stats.requests.timeout_count}
            color="red"
          />
          <StatCard
            label="Total"
            value={stats.requests.total_count}
            color="blue"
            link="/history"
          />
        </div>
      </div>

      {/* Knowledge Base Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Knowledge Base
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <StatCard
            label="Total Entries"
            value={stats.knowledge.active_count}
            color="blue"
            link="/knowledge"
          />
          <StatCard
            label="Learned from Requests"
            value={stats.knowledge.learned_data_count}
            color="green"
            link="/learned"
          />
          <StatCard
            label="Pre-seeded Data"
            value={stats.knowledge.seeded_data_count}
            color="gray"
          />
        </div>

        {stats.knowledge.most_used && (
          <div className="mt-4 p-4 bg-gray-50 rounded border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Most Used Knowledge Entry (Used{" "}
              {stats.knowledge.most_used.times_used} times)
            </h4>
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-medium">Q:</span>{" "}
              {stats.knowledge.most_used.question_pattern}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">A:</span>{" "}
              {stats.knowledge.most_used.answer}
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {/* <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="flex space-x-4">
          <Link
            href="/pending"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            View Pending Requests
          </Link>
          <Link
            href="/knowledge"
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Manage Knowledge Base
          </Link>
        </div>
      </div> */}
    </div>
  );
}

function StatCard({ label, value, color, link }) {
  const colorClasses = {
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
    green: "bg-green-100 text-green-800 border-green-200",
    red: "bg-red-100 text-red-800 border-red-200",
    blue: "bg-blue-100 text-blue-800 border-blue-200",
    gray: "bg-gray-100 text-gray-800 border-gray-200",
  };

  const content = (
    <div
      className={`p-4 rounded border ${colorClasses[color]} ${
        link ? "cursor-pointer hover:shadow-md transition-shadow" : ""
      }`}
    >
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm font-medium mt-1">{label}</div>
    </div>
  );

  if (link) {
    return <Link href={link}>{content}</Link>;
  }

  return content;
}
