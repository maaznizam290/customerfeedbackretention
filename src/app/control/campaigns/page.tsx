"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/apiClient";

interface Campaign {
  campaign_id: string;
  campaign_code: string;
  enterprise_id: string;
  segment: string;
  name: string;
  category: string;
  campaign_type: string;
  behaviour_id: string | null;
  reward_type: string;
  reward_coins: number;
  experience_title: string | null;
  token_capacity: number | null;
  max_tokens_per_customer: number | null;
  tokens_issued: number;
  selection_method: string;
  winner_count: number;
  package_id: string | null;
  status: string;
}

interface Behaviour {
  behavior_id: string;
  name: string;
}

interface ApiPackageLite {
  package_id: string;
  name: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-500/10 text-slate-300",
  ACTIVE: "bg-emerald-500/10 text-emerald-400",
  PAUSED: "bg-amber-500/10 text-amber-400",
  CLOSED: "bg-orange-500/10 text-orange-400",
  COMPLETED: "bg-sky-500/10 text-sky-400",
};

const NEXT_ACTIONS: Record<string, { label: string; status: string }[]> = {
  DRAFT: [{ label: "Activate", status: "ACTIVE" }],
  ACTIVE: [
    { label: "Pause", status: "PAUSED" },
    { label: "Close", status: "CLOSED" },
  ],
  PAUSED: [
    { label: "Resume", status: "ACTIVE" },
    { label: "Close", status: "CLOSED" },
  ],
  CLOSED: [{ label: "Mark Completed", status: "COMPLETED" }],
  COMPLETED: [],
};

const CAMPAIGN_TYPES = ["SIGNUP", "PACKAGE_SUBSCRIPTION", "REFERRAL_SUCCESS", "RECHARGE_THRESHOLD", "PARTNER_PURCHASE", "GENERAL"];
const REWARD_TYPES = ["COIN", "EXPERIENCE", "VIP_EXPERIENCE", "PRODUCT", "CASHBACK", "DISCOUNT", "VOUCHER", "HOTEL_STAY", "TRAVEL", "ATTRACTION"];

const emptyForm = {
  campaign_code: "",
  name: "",
  category: "",
  campaign_type: "RECHARGE_THRESHOLD",
  behaviour_id: "",
  description: "",
  eligibility: "",
  reward_type: "COIN",
  reward_coins: "1",
  experience_title: "",
  experience_description: "",
  token_capacity: "",
  max_tokens_per_customer: "",
  selection_method: "ALL_ELIGIBLE" as "ALL_ELIGIBLE" | "RANDOM_DRAW",
  winner_count: "1",
  package_id: "",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [behaviours, setBehaviours] = useState<Behaviour[]>([]);
  const [packages, setPackages] = useState<ApiPackageLite[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyCampaignId, setBusyCampaignId] = useState<string | null>(null);

  function load() {
    apiFetch<{ campaigns: Campaign[] }>("/admin/campaigns", { method: "GET" })
      .then((d) => setCampaigns(d.campaigns))
      .catch(() => setCampaigns([]));
  }

  useEffect(() => {
    load();
    apiFetch<{ behaviours: Behaviour[] }>("/admin/behaviours", { method: "GET" }).then((d) =>
      setBehaviours(d.behaviours)
    );
    apiFetch<{ packages: ApiPackageLite[] }>("/packages/catalog", { method: "GET" }).then((d) =>
      setPackages(d.packages)
    );
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/admin/campaigns", {
        method: "POST",
        body: JSON.stringify({
          campaign_code: form.campaign_code,
          name: form.name,
          category: form.category,
          campaign_type: form.campaign_type,
          behaviour_id: form.behaviour_id || undefined,
          description: form.description,
          eligibility: form.eligibility,
          reward_type: form.reward_type,
          reward_coins: Number(form.reward_coins || 0),
          experience_title: form.experience_title || undefined,
          experience_description: form.experience_description || undefined,
          token_capacity: form.token_capacity ? Number(form.token_capacity) : undefined,
          max_tokens_per_customer: form.max_tokens_per_customer ? Number(form.max_tokens_per_customer) : undefined,
          selection_method: form.selection_method,
          winner_count: Number(form.winner_count || 1),
          package_id: form.package_id || undefined,
        }),
      });
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create campaign.");
    } finally {
      setSubmitting(false);
    }
  }

  async function transition(campaignId: string, status: string) {
    setBusyCampaignId(campaignId);
    try {
      await apiFetch(`/admin/campaigns/${campaignId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not update campaign status.");
    } finally {
      setBusyCampaignId(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-black text-white">Campaigns</h1>
      <p className="mt-1 text-sm text-slate-400">
        A campaign couples an Enterprise, a qualifying Behaviour and a reward/experience. Draft → Active → Paused →
        Closed → Completed.
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="px-4 py-3 font-semibold">Campaign</th>
              <th className="px-4 py-3 font-semibold">Behaviour</th>
              <th className="px-4 py-3 font-semibold">Reward</th>
              <th className="px-4 py-3 font-semibold">Tokens</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {campaigns === null ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : (
              campaigns.map((c) => (
                <tr key={c.campaign_id} className="border-b border-slate-800/60 last:border-0 align-top">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-white">{c.name}</p>
                    <p className="font-mono text-xs text-slate-500">{c.campaign_id}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{c.behaviour_id ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {c.experience_title ?? `${c.reward_type} (+${c.reward_coins} Coins)`}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {c.token_capacity ? `${c.tokens_issued} / ${c.token_capacity}` : `${c.tokens_issued} (unlimited)`}
                    {c.max_tokens_per_customer && (
                      <p className="mt-0.5 text-slate-500">max {c.max_tokens_per_customer}/customer</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_COLORS[c.status] ?? ""}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {(NEXT_ACTIONS[c.status] ?? []).map((action) => (
                        <button
                          key={action.status}
                          type="button"
                          disabled={busyCampaignId === c.campaign_id}
                          onClick={() => transition(c.campaign_id, action.status)}
                          className="rounded-full border border-slate-700 px-2.5 py-1 text-xs font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-400">Create Campaign</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <input required placeholder="Campaign code (e.g. F1)" value={form.campaign_code} onChange={(e) => setForm((f) => ({ ...f, campaign_code: e.target.value }))} className="admin-input" />
          <input required placeholder="Category (e.g. Featured Experience)" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="admin-input" />
          <input required placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="admin-input col-span-2" />
          <select value={form.campaign_type} onChange={(e) => setForm((f) => ({ ...f, campaign_type: e.target.value }))} className="admin-select">
            {CAMPAIGN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={form.behaviour_id} onChange={(e) => setForm((f) => ({ ...f, behaviour_id: e.target.value }))} className="admin-select">
            <option value="">No qualifying behaviour (informational)</option>
            {behaviours.map((b) => <option key={b.behavior_id} value={b.behavior_id}>{b.name}</option>)}
          </select>
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="admin-input col-span-2" rows={2} />
          <input placeholder="Eligibility copy" value={form.eligibility} onChange={(e) => setForm((f) => ({ ...f, eligibility: e.target.value }))} className="admin-input col-span-2" />

          <select value={form.reward_type} onChange={(e) => setForm((f) => ({ ...f, reward_type: e.target.value }))} className="admin-select">
            {REWARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="number" min={0} placeholder="Reward Coins" value={form.reward_coins} onChange={(e) => setForm((f) => ({ ...f, reward_coins: e.target.value }))} className="admin-input" />

          <input placeholder="Experience title (optional)" value={form.experience_title} onChange={(e) => setForm((f) => ({ ...f, experience_title: e.target.value }))} className="admin-input col-span-2" />
          <textarea placeholder="Experience description (optional)" value={form.experience_description} onChange={(e) => setForm((f) => ({ ...f, experience_description: e.target.value }))} className="admin-input col-span-2" rows={2} />

          <input type="number" min={1} placeholder="Token capacity (blank = unlimited)" value={form.token_capacity} onChange={(e) => setForm((f) => ({ ...f, token_capacity: e.target.value }))} className="admin-input" />
          <input type="number" min={1} placeholder="Max tokens / customer (blank = unlimited)" value={form.max_tokens_per_customer} onChange={(e) => setForm((f) => ({ ...f, max_tokens_per_customer: e.target.value }))} className="admin-input" />
          <select value={form.selection_method} onChange={(e) => setForm((f) => ({ ...f, selection_method: e.target.value as "ALL_ELIGIBLE" | "RANDOM_DRAW" }))} className="admin-select">
            <option value="ALL_ELIGIBLE">ALL_ELIGIBLE (no draw)</option>
            <option value="RANDOM_DRAW">RANDOM_DRAW (server-side draw)</option>
          </select>
          {form.selection_method === "RANDOM_DRAW" && (
            <input type="number" min={1} placeholder="Winner count" value={form.winner_count} onChange={(e) => setForm((f) => ({ ...f, winner_count: e.target.value }))} className="admin-input" />
          )}

          {form.campaign_type === "PACKAGE_SUBSCRIPTION" && (
            <select value={form.package_id} onChange={(e) => setForm((f) => ({ ...f, package_id: e.target.value }))} className="admin-select col-span-2">
              <option value="">Scope to package…</option>
              {packages.map((p) => <option key={p.package_id} value={p.package_id}>{p.name}</option>)}
            </select>
          )}
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={submitting} className="mt-4 rounded-full bg-atharx-teal px-5 py-2.5 text-sm font-bold text-atharx-ink disabled:opacity-60">
          {submitting ? "Creating…" : "Create Campaign (starts as DRAFT)"}
        </button>
      </form>
    </div>
  );
}
