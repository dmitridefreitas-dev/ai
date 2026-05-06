"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type SmsRow = {
  id: string;
  direction: string;
  to_phone: string;
  from_phone: string;
  body: string;
  type: string;
  created_at: string;
};

export default function MessagesPage() {
  const [messages, setMessages] = useState<SmsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [twilioNumber, setTwilioNumber] = useState("");
  const [showSend, setShowSend] = useState(false);
  const [sendTo, setSendTo] = useState("");
  const [sendBody, setSendBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser.user) return;

      const { data: staffRow } = await supabase
        .from("staff")
        .select("clinic_id")
        .eq("auth_user_id", authUser.user.id)
        .single();

      if (!staffRow) return;
      setClinicId(staffRow.clinic_id);

      const { data: clinic } = await supabase
        .from("clinics")
        .select("twilio_number")
        .eq("id", staffRow.clinic_id)
        .single();

      if (clinic) setTwilioNumber(clinic.twilio_number);

      const { data } = await supabase
        .from("sms_messages")
        .select("*")
        .eq("clinic_id", staffRow.clinic_id)
        .order("created_at", { ascending: false })
        .limit(100);

      setMessages(data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!clinicId || !sendTo || !sendBody) return;
    setSending(true);

    const res = await fetch("/api/actions/send-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: sendTo,
        body: sendBody,
        clinicId,
        from: twilioNumber,
        type: "manual",
      }),
    });

    if (res.ok) {
      setSendTo("");
      setSendBody("");
      setShowSend(false);

      const supabase = createClient();
      const { data } = await supabase
        .from("sms_messages")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false })
        .limit(100);
      setMessages(data || []);
    }

    setSending(false);
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading messages...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Messages</h1>
        <button
          onClick={() => setShowSend(!showSend)}
          className="bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Send SMS
        </button>
      </div>

      {showSend && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
          <form onSubmit={handleSend} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To (phone number)</label>
              <input
                type="tel"
                value={sendTo}
                onChange={(e) => setSendTo(e.target.value)}
                placeholder="+12465551234"
                className="input w-64"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={sendBody}
                onChange={(e) => setSendBody(e.target.value)}
                className="input"
                rows={3}
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={sending}
                className="bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {sending ? "Sending..." : "Send"}
              </button>
              <button
                type="button"
                onClick={() => setShowSend(false)}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {messages.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No messages yet.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b">
                <th className="px-5 py-3">Time</th>
                <th className="px-5 py-3">Direction</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {messages.map((msg) => (
                <tr key={msg.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm text-gray-500">
                    {new Date(msg.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        msg.direction === "inbound"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {msg.direction === "inbound" ? "In" : "Out"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm">
                    {msg.direction === "inbound" ? msg.from_phone : msg.to_phone}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500 capitalize">{msg.type}</td>
                  <td className="px-5 py-3 text-sm text-gray-600 max-w-md truncate">{msg.body}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
