// supabase/functions/autopilot-control/index.ts
// Minimal control plane for the one-page /bot UI.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ControlAction =
  | { action: "set_mode"; mode: "off" | "paper" | "live" }
  | { action: "set_running"; is_running: boolean }
  | { action: "reset_kill_switch" }
  | { action: "stop_all" }
  | { action: "close_position"; position_id: string; reason?: string };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRole) {
    return json({ error: "Missing backend configuration" }, 500);
  }

  const admin = createClient(url, serviceRole, {
    auth: { persistSession: false },
  });

  let payload: ControlAction;
  try {
    payload = (await req.json()) as ControlAction;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  // Autopilot state is expected to be a single-row table.
  const { data: stateRow, error: stateErr } = await admin
    .from("autopilot_state")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (stateErr) return json({ error: stateErr.message }, 500);

  const stateId = stateRow?.id as string | undefined;
  const nowIso = new Date().toISOString();

  if (payload.action === "set_mode") {
    if (!stateId) {
      const { error } = await admin
        .from("autopilot_state")
        .insert({ mode: payload.mode, is_running: false });
      if (error) return json({ error: error.message }, 500);
    } else {
      const { error } = await admin
        .from("autopilot_state")
        .update({ mode: payload.mode, updated_at: nowIso })
        .eq("id", stateId);
      if (error) return json({ error: error.message }, 500);
    }

    return json({ ok: true, mode: payload.mode });
  }

  if (!stateId) {
    return json({ error: "autopilot_state not initialized" }, 400);
  }

  if (payload.action === "set_running") {
    const { error } = await admin
      .from("autopilot_state")
      .update({ is_running: payload.is_running, updated_at: nowIso })
      .eq("id", stateId);
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true, is_running: payload.is_running });
  }

  if (payload.action === "reset_kill_switch") {
    const { error } = await admin
      .from("autopilot_state")
      .update({
        kill_switch_active: false,
        kill_switch_reason: null,
        daily_drawdown_eur: 0,
        updated_at: nowIso,
      })
      .eq("id", stateId);
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true });
  }

  if (payload.action === "stop_all") {
    // 1) stop running
    const { error: stopErr } = await admin
      .from("autopilot_state")
      .update({ is_running: false, updated_at: nowIso })
      .eq("id", stateId);
    if (stopErr) return json({ error: stopErr.message }, 500);

    // 2) mark open positions as stopped
    const { error: posErr } = await admin
      .from("autopilot_positions")
      .update({
        status: "stopped",
        exit_ts: nowIso,
        exit_reason: "Manual STOP ALL",
        updated_at: nowIso,
      })
      .eq("status", "open");

    if (posErr) return json({ error: posErr.message }, 500);

    return json({ ok: true });
  }

  if (payload.action === "close_position") {
    const { error } = await admin
      .from("autopilot_positions")
      .update({
        status: "closed",
        exit_ts: nowIso,
        exit_reason: payload.reason ?? "Manual close",
        updated_at: nowIso,
      })
      .eq("id", payload.position_id);

    if (error) return json({ error: error.message }, 500);

    return json({ ok: true });
  }

  return json({ error: "Unknown action" }, 400);
});
