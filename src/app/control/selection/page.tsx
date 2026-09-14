"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/apiClient";

interface Campaign {
  campaign_id: string;
  name: string;
  status: string;
  selection_method: string;
  tokens_issued: number;
  token_capacity: number | null;
  winner_count: number;
}

interface SelectionDetail {
  campaign_id: string;
  campaign_status: string | null;
  eligible_tokens: number;
  run: {
    run_id: string;
    eligible_count: number;
    selected_count: number;
    executed_at: string;
    algorithm_version: string;
    audit_reference: string;
  } | null;
  results: { result_id: string; token_id: string; customer_id: string; customer_name: string | null; rank: number }[];
}

export default function SelectionPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SelectionDetail | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadCampaigns() {
    apiFetch<{ campaigns: Campaign[] }>("/admin/campaigns", { method: "GET" }).then((d) =>
      setCampaigns(d.campaigns.filter((c) => c.selection_method === "RANDOM_DRAW"))
    );
  }

  useEffect(loadCampaigns, []);

  function loadDetail(campaignId: string) {
    setSelectedCampaignId(campaignId);
    apiFetch<SelectionDetail>(`/admin/selection/${campaignId}`, { method: "GET" }).then(setDetail);
  }

  async function execute(campaignId: string) {
    setRunning(true);
    setError(null);
    try {
      await apiFetch(`/admin/selection/${campaignId}/execute`, { method: "POST" });
      loadDetail(campaignId);
      loadCampaigns();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not execute selection.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-black text-white">Selection & Results</h1>
      <p className="mt-1 text-sm text-slate-400">
        Limited-inventory experience campaigns (RANDOM_DRAW) only. Close a campaign in the Campaigns screen first, then
        run selection here — winners are chosen server-side (CSPRNG) with a full audit trail. This demonstrates
        mechanics only; it is not a regulated draw.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {campaigns.map((c) => (
          <button
            key={c.campaign_id}
            type="button"
            onClick={() => loadDetail(c.campaign_id)}
            className={`rounded-2xl border p-4 text-left transition ${
              selectedCampaignId === c.campaign_id
                ? "border-atharx-teal bg-atharx-teal/10"
                : "border-slate-800 bg-slate-900 hover:border-slate-700"
            }`}
          >
            <p className="font-bold text-white">{c.name}</p>
            <p className="mt-1 text-xs text-slate-400">
              {c.tokens_issued} tokens issued{c.token_capacity ? ` / ${c.token_capacity} capacity` : ""} · winners:{" "}
              {c.winner_count}
            </p>
            <span className="mt-2 inline-block rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-bold text-slate-300">
              {c.status}
            </span>
          </button>
        ))}
      </div>

      {detail && (
        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white">{detail.campaign_id}</h2>
            {detail.campaign_status === "CLOSED" && !detail.run && (
              <button
                type="button"
                disabled={running}
                onClick={() => execute(detail.campaign_id)}
                className="rounded-full bg-atharx-teal px-5 py-2 text-sm font-black text-atharx-ink disabled:opacity-60"
              >
                {running ? "Running…" : "Execute Selection"}
              </button>
            )}
          </div>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

          {detail.campaign_status !== "CLOSED" && !detail.run && (
            <p className="mt-3 text-sm text-slate-400">
              This campaign is <b>{detail.campaign_status}</b>. Close it from the Campaigns screen before running
              selection ({detail.eligible_tokens} tokens currently issued).
            </p>
          )}

          {detail.run && (
            <>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <Stat label="Eligible" value={detail.run.eligible_count} />
                <Stat label="Selected" value={detail.run.selected_count} />
                <Stat label="Algorithm" value={detail.run.algorithm_version} />
              </div>
              <table className="mt-4 w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500">
                    <th className="py-2 font-semibold">Rank</th>
                    <th className="py-2 font-semibold">Customer</th>
                    <th className="py-2 font-semibold">Token</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.results.map((r) => (
                    <tr key={r.result_id} className="border-b border-slate-800/60 last:border-0">
                      <td className="py-2 font-bold text-amber-400">#{r.rank}</td>
                      <td className="py-2 text-white">
                        {r.customer_name} <span className="text-slate-500">({r.customer_id})</span>
                      </td>
                      <td className="py-2 font-mono text-xs text-atharx-teal2">{r.token_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-[11px] text-slate-500">Audit reference: {detail.run.audit_reference}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-slate-800/60 p-3">
      <p className="text-lg font-black text-white">{value}</p>
      <p className="text-[11px] font-semibold text-slate-400">{label}</p>
    </div>
  );
}
