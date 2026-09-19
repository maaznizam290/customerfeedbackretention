"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/apiClient";

interface Behaviour {
  behavior_id: string;
  name: string;
  event_type: string;
  rule: { amount_gte?: number };
}

interface CustomerLite {
  customer_id: string;
  full_name: string;
}

interface SimResult {
  success: boolean;
  qualified: boolean;
  campaign_id: string | null;
  token_id: string | null;
  coin_reward: number;
  status: string;
  reason: string | null;
  is_replay: boolean;
}

interface EventRow {
  event_id: string;
  customer_name: string | null;
  customer_id: string;
  event_type: string;
  qualified: boolean;
  campaign_id: string | null;
  token_id: string | null;
  coin_reward: number;
  created_at: string;
}

export default function SimulatorPage() {
  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [behaviours, setBehaviours] = useState<Behaviour[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [behaviorId, setBehaviorId] = useState("");
  const [amount, setAmount] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [lastIdempotencyKey, setLastIdempotencyKey] = useState<string | null>(null);

  function loadEvents() {
    apiFetch<{ events: EventRow[] }>("/admin/events", { method: "GET" }).then((d) => setEvents(d.events));
  }

  useEffect(() => {
    apiFetch<{ customers: CustomerLite[] }>("/admin/customers?limit=30", { method: "GET" }).then((d) =>
      setCustomers(d.customers)
    );
    apiFetch<{ behaviours: Behaviour[] }>("/admin/behaviours", { method: "GET" }).then((d) =>
      setBehaviours(d.behaviours)
    );
    loadEvents();
  }, []);

  const selectedBehaviour = behaviours.find((b) => b.behavior_id === behaviorId);

  async function submitEvent(idempotencyKey: string) {
    setError(null);
    setResult(null);
    setRunning(true);
    try {
      const response = await apiFetch<SimResult>("/events/qualifying", {
        method: "POST",
        body: JSON.stringify({
          enterprise_id: "OMT",
          customer_id: customerId,
          event_type: selectedBehaviour?.event_type ?? "RECHARGE",
          amount: amount ? Number(amount) : undefined,
          idempotency_key: idempotencyKey,
        }),
      });
      setResult(response);
      setLastIdempotencyKey(idempotencyKey);
      loadEvents();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not simulate event.");
    } finally {
      setRunning(false);
    }
  }

  function handleSimulate(e: FormEvent) {
    e.preventDefault();
    return submitEvent(`SIM-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  }

  function handleResubmitDuplicate() {
    if (!lastIdempotencyKey) return;
    return submitEvent(lastIdempotencyKey);
  }

  return (
    <div>
      <h1 className="text-2xl font-black text-white">Simulator</h1>
      <p className="mt-1 text-sm text-slate-400">
        The engine, made visible: pick a customer and a behaviour, fire the event, and watch qualification → token
        issuance → Coin credit happen live — the exact same pipeline a real Omantel recharge or subscription would go
        through.
      </p>

      <form onSubmit={handleSimulate} className="mt-6 max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Customer</label>
            <input
              required
              list="customer-options"
              placeholder="Paste or pick a customer_id (e.g. CUS-OM-000001)"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="admin-input"
            />
            <datalist id="customer-options">
              {customers.map((c) => (
                <option key={c.customer_id} value={c.customer_id}>
                  {c.full_name}
                </option>
              ))}
            </datalist>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Behaviour</label>
            <select required value={behaviorId} onChange={(e) => setBehaviorId(e.target.value)} className="admin-select">
              <option value="">Select a behaviour…</option>
              {behaviours.map((b) => (
                <option key={b.behavior_id} value={b.behavior_id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Amount {selectedBehaviour?.rule.amount_gte !== undefined && `(rule requires >= ${selectedBehaviour.rule.amount_gte})`}
            </label>
            <input
              type="number"
              step="0.1"
              placeholder="OMR amount (if applicable)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="admin-input"
            />
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={running}
          className="mt-5 w-full rounded-full bg-atharx-teal py-3 text-sm font-black text-atharx-ink disabled:opacity-60"
        >
          {running ? "Simulating…" : "SIMULATE BEHAVIOUR"}
        </button>
      </form>

      {result && (
        <div className="mt-6 max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6">
          {result.is_replay && (
            <p className="mb-3 rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-400">
              Duplicate rejected — same idempotency key, original outcome returned, no new Token/Coin
            </p>
          )}
          {result.qualified ? (
            <>
              <p className="text-sm font-black text-emerald-400">QUALIFIED ✓</p>
              <div className="mt-3 space-y-2 text-sm">
                <Row label="Token Issued" value={result.token_id ?? "—"} mono />
                <Row label="Coin Reward" value={`+${result.coin_reward}`} />
                <Row label="Campaign" value={result.campaign_id ?? "—"} mono />
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-black text-slate-400">NOT QUALIFIED</p>
              <p className="mt-2 text-sm text-slate-500">{result.reason ?? "No active campaign currently qualifies."}</p>
            </>
          )}
          {!result.is_replay && lastIdempotencyKey && (
            <button
              type="button"
              onClick={handleResubmitDuplicate}
              disabled={running}
              className="mt-4 rounded-full border border-slate-700 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-60"
            >
              Resubmit same event (test duplicate rejection)
            </button>
          )}
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-400">Recent Events</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Event</th>
                <th className="px-4 py-3 font-semibold">Qualified</th>
                <th className="px-4 py-3 font-semibold">Token</th>
                <th className="px-4 py-3 font-semibold">Coins</th>
                <th className="px-4 py-3 font-semibold">When</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    No events yet — run the simulator above.
                  </td>
                </tr>
              ) : (
                events.map((e) => (
                  <tr key={e.event_id} className="border-b border-slate-800/60 last:border-0">
                    <td className="px-4 py-3 text-slate-300">{e.customer_name ?? e.customer_id}</td>
                    <td className="px-4 py-3 text-slate-400">{e.event_type}</td>
                    <td className="px-4 py-3">
                      {e.qualified ? (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-400">Yes</span>
                      ) : (
                        <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-xs font-bold text-slate-400">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-atharx-teal2">{e.token_id ?? "—"}</td>
                    <td className="px-4 py-3 text-amber-400">{e.coin_reward > 0 ? `+${e.coin_reward}` : "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{new Date(e.created_at).toLocaleTimeString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={`font-bold text-white ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
