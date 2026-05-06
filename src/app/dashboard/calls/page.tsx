"use client";

import { useEffect, useState } from "react";

type CallRow = {
  id: string;
  caller_phone: string;
  direction: string;
  duration_seconds: number;
  outcome: string;
  transcript: string | null;
  actions_taken: unknown;
  created_at: string;
};

const outcomeColors: Record<string, string> = {
  booked: "bg-green-100 text-green-800",
  transferred: "bg-blue-100 text-blue-800",
  info_only: "bg-gray-100 text-gray-600",
  voicemail: "bg-yellow-100 text-yellow-800",
  missed: "bg-red-100 text-red-800",
};

export default function CallLogPage() {
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/data?table=call_logs")
      .then((r) => r.json())
      .then((res) => {
        setCalls(res.data || []);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading calls...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Call Log</h1>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {calls.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No calls recorded yet.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b">
                <th className="px-5 py-3">Time</th>
                <th className="px-5 py-3">Caller</th>
                <th className="px-5 py-3">Direction</th>
                <th className="px-5 py-3">Duration</th>
                <th className="px-5 py-3">Outcome</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {calls.map((call) => (
                <tr key={call.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm">
                    {new Date(call.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-5 py-3 text-sm font-medium">{call.caller_phone}</td>
                  <td className="px-5 py-3 text-sm text-gray-600 capitalize">{call.direction}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">
                    {Math.floor(call.duration_seconds / 60)}:{(call.duration_seconds % 60).toString().padStart(2, "0")}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        outcomeColors[call.outcome] || "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {call.outcome}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {call.transcript && (
                      <button
                        onClick={() => setExpandedId(expandedId === call.id ? null : call.id)}
                        className="text-sky-500 hover:text-sky-600 text-sm"
                      >
                        {expandedId === call.id ? "Hide" : "Transcript"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {expandedId && (
          <div className="border-t border-gray-200 p-5 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Transcript</h3>
            <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans">
              {calls.find((c) => c.id === expandedId)?.transcript || "No transcript available."}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
