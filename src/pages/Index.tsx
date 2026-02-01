import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  supabaseReady, 
  getSupabaseEnvStatus, 
  safeQuery, 
  restPing, 
  restWhoAmI,
  authHealth,
  authSessionStatus,
  restTableProbe,
  warmup,
  getStatusHint 
} from "@/lib/supabaseHelpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  Database, 
  Loader2, 
  RefreshCw, 
  ArrowRight,
  Copy,
  AlertTriangle,
  Wifi,
  Key,
  Server,
  Clock,
  Zap,
  User
} from "lucide-react";
import { Link } from "react-router-dom";

type PingResult = {
  ok: boolean;
  status: number;
  statusText: string;
  text: string;
  elapsedMs: number;
  error?: string;
} | null;

type SessionResult = {
  hasSession: boolean;
  userId?: string;
  expiresAt?: number;
  error?: string;
} | null;

type TestResult = {
  table: string;
  status: "idle" | "loading" | "success" | "error" | "timeout";
  data: any[] | null;
  error: string | null;
  rowCount: number;
  elapsedMs: number;
  retryAttempts?: number;
};

type ProbeResult = {
  table: string;
  status: "idle" | "loading" | "success" | "error";
  httpStatus: number;
  text: string;
  elapsedMs: number;
} | null;

const TABLES_TO_TEST = [
  { name: "symbols", label: "Symbols" },
  { name: "exchanges", label: "Exchanges" },
  { name: "computed_metrics_v2", label: "Computed Metrics V2" },
  { name: "trading_signals", label: "Trading Signals" },
  { name: "funding_rates", label: "Funding Rates" },
];

export default function HealthCheck() {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [probeResults, setProbeResults] = useState<Record<string, ProbeResult>>({});
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [isProbingAll, setIsProbingAll] = useState(false);
  const [restPingResult, setRestPingResult] = useState<PingResult>(null);
  const [authHealthResult, setAuthHealthResult] = useState<PingResult>(null);
  const [sessionResult, setSessionResult] = useState<SessionResult>(null);
  const [isPingingRest, setIsPingingRest] = useState(false);
  const [isPingingAuth, setIsPingingAuth] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(false);
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [warmupResult, setWarmupResult] = useState<any>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const envStatus = getSupabaseEnvStatus();

  // REST Ping test
  const handleRestPing = async () => {
    setIsPingingRest(true);
    setRestPingResult(null);
    const result = await restPing();
    setRestPingResult(result);
    setIsPingingRest(false);
  };

  // Auth Health test (public endpoint)
  const handleAuthHealth = async () => {
    setIsPingingAuth(true);
    setAuthHealthResult(null);
    const result = await authHealth();
    setAuthHealthResult(result);
    setIsPingingAuth(false);
  };

  // Session status check
  const handleSessionCheck = async () => {
    setIsCheckingSession(true);
    setSessionResult(null);
    const result = await authSessionStatus();
    setSessionResult(result);
    setIsCheckingSession(false);
  };

  // Warmup
  const handleWarmup = async () => {
    setIsWarmingUp(true);
    setWarmupResult(null);
    const result = await warmup();
    setWarmupResult(result);
    setIsWarmingUp(false);
  };

  // REST Table Probe
  const probeTable = async (tableName: string) => {
    setProbeResults((prev) => ({
      ...prev,
      [tableName]: { 
        table: tableName, 
        status: "loading", 
        httpStatus: 0, 
        text: "", 
        elapsedMs: 0 
      },
    }));

    const result = await restTableProbe(tableName);

    setProbeResults((prev) => ({
      ...prev,
      [tableName]: {
        table: tableName,
        status: result.ok ? "success" : "error",
        httpStatus: result.status,
        text: result.text,
        elapsedMs: result.elapsedMs,
      },
    }));
  };

  // Probe all tables
  const probeAllTables = async () => {
    setIsProbingAll(true);
    for (const table of TABLES_TO_TEST) {
      await probeTable(table.name);
    }
    setIsProbingAll(false);
  };

  // Supabase-js table query test (lightweight)
  const testTable = async (tableName: string) => {
    setResults((prev) => ({
      ...prev,
      [tableName]: { 
        table: tableName, 
        status: "loading", 
        data: null, 
        error: null, 
        rowCount: 0,
        elapsedMs: 0
      },
    }));

    const result = await safeQuery(async () =>
      await supabase.from(tableName as any).select("*").limit(5)
    );

    if (result.timedOut) {
      setResults((prev) => ({
        ...prev,
        [tableName]: {
          table: tableName,
          status: "timeout",
          data: null,
          error: `ABORT after ${result.elapsedMs}ms (retries: ${result.retryAttempts})`,
          rowCount: 0,
          elapsedMs: result.elapsedMs,
          retryAttempts: result.retryAttempts,
        },
      }));
    } else if (result.error) {
      setResults((prev) => ({
        ...prev,
        [tableName]: {
          table: tableName,
          status: "error",
          data: null,
          error: result.error,
          rowCount: 0,
          elapsedMs: result.elapsedMs,
          retryAttempts: result.retryAttempts,
        },
      }));
    } else {
      setResults((prev) => ({
        ...prev,
        [tableName]: {
          table: tableName,
          status: "success",
          data: result.data as any[],
          error: null,
          rowCount: Array.isArray(result.data) ? result.data.length : 0,
          elapsedMs: result.elapsedMs,
          retryAttempts: result.retryAttempts,
        },
      }));
    }
  };

  const testAllTables = async () => {
    setIsTestingAll(true);
    for (const table of TABLES_TO_TEST) {
      await testTable(table.name);
    }
    setIsTestingAll(false);
  };

  // Copy diagnostics to clipboard
  const copyDiagnostics = useCallback(() => {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        urlPresent: envStatus.hasUrl,
        keyPresent: envStatus.hasKey,
        urlLength: envStatus.urlLength,
        keyLength: envStatus.keyLength,
        supabaseReady,
      },
      restPing: restPingResult,
      authHealth: authHealthResult,
      session: sessionResult,
      warmup: warmupResult,
      tableProbes: Object.values(probeResults),
      tableTests: Object.values(results).map(r => ({
        table: r.table,
        status: r.status,
        rowCount: r.rowCount,
        elapsedMs: r.elapsedMs,
        retryAttempts: r.retryAttempts,
        error: r.error,
      })),
    };

    navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2)).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  }, [envStatus, restPingResult, authHealthResult, sessionResult, warmupResult, probeResults, results]);

  const allTestsPassed = TABLES_TO_TEST.every(
    (t) => results[t.name]?.status === "success"
  );

  const renderStatusBadge = (result: PingResult) => {
    if (!result) return null;
    if (result.error === 'TIMEOUT') {
      return <Badge variant="destructive">TIMEOUT</Badge>;
    }
    if (result.error === 'NETWORK_ERROR') {
      return <Badge variant="destructive">NETWORK ERROR</Badge>;
    }
    if (result.ok) {
      return <Badge variant="default">{result.status} OK</Badge>;
    }
    return <Badge variant="destructive">{result.status} {result.statusText}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              System Health Check
            </h1>
            <p className="text-muted-foreground mt-1">
              Deep diagnostics for environment, network, and database connectivity
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyDiagnostics}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              {copySuccess ? "Copied!" : "Copy Diagnostics"}
            </Button>
            {allTestsPassed && (
              <Link to="/dashboard">
                <Button className="gap-2">
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Section A: Environment Variables Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Key className="h-5 w-5" />
              Section A: Environment & Client Status
            </CardTitle>
            <CardDescription>
              Verify that Supabase credentials are properly configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  {envStatus.hasUrl ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <div>
                    <p className="font-mono text-sm">VITE_SUPABASE_URL</p>
                    <p className="text-xs text-muted-foreground">
                      {envStatus.hasUrl ? envStatus.urlMasked : "NOT SET"} 
                      {envStatus.hasUrl && ` (${envStatus.urlLength} chars)`}
                    </p>
                  </div>
                </div>
                <Badge variant={envStatus.hasUrl ? "default" : "destructive"}>
                  {envStatus.hasUrl ? "OK" : "MISSING"}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  {envStatus.hasKey ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <div>
                    <p className="font-mono text-sm">VITE_SUPABASE_PUBLISHABLE_KEY</p>
                    <p className="text-xs text-muted-foreground">
                      {envStatus.hasKey ? "••••••••••••••••" : "NOT SET"}
                      {envStatus.hasKey && ` (${envStatus.keyLength} chars)`}
                    </p>
                  </div>
                </div>
                <Badge variant={envStatus.hasKey ? "default" : "destructive"}>
                  {envStatus.hasKey ? "OK" : "MISSING"}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  {supabaseReady ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <div>
                    <p className="font-medium">Supabase Client</p>
                    <p className="text-xs text-muted-foreground">
                      {supabaseReady ? "Client initialized and ready" : "Client not initialized"}
                    </p>
                  </div>
                </div>
                <Badge variant={supabaseReady ? "default" : "destructive"}>
                  {supabaseReady ? "READY" : "NOT READY"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section B: Network Diagnostics */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Section B: Network Diagnostics
            </CardTitle>
            <CardDescription>
              Direct HTTP requests to Supabase endpoints (bypasses SDK)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Warmup */}
            <div className="border rounded-lg p-4 bg-primary/5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="font-medium">Warmup</span>
                  <span className="text-xs text-muted-foreground">Pre-warm PostgREST connection</span>
                </div>
                <Button
                  size="sm"
                  onClick={handleWarmup}
                  disabled={!supabaseReady || isWarmingUp}
                >
                  {isWarmingUp ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Warmup"
                  )}
                </Button>
              </div>
              {warmupResult && (
                <div className="mt-2 text-xs space-y-1">
                  <p>REST Ping: {warmupResult.restPing?.status} ({warmupResult.restPing?.elapsedMs}ms)</p>
                  <p>Table Probe: {warmupResult.tableProbe?.status} ({warmupResult.tableProbe?.elapsedMs}ms)</p>
                </div>
              )}
            </div>

            {/* REST Ping */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">REST Ping</span>
                  <span className="text-xs text-muted-foreground font-mono">/rest/v1/</span>
                </div>
                <div className="flex items-center gap-2">
                  {restPingResult && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {restPingResult.elapsedMs}ms
                    </span>
                  )}
                  {renderStatusBadge(restPingResult)}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRestPing}
                    disabled={!supabaseReady || isPingingRest}
                  >
                    {isPingingRest ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Test"
                    )}
                  </Button>
                </div>
              </div>
              {restPingResult && (
                <div className="mt-2">
                  {getStatusHint(restPingResult.status, restPingResult.error) && (
                    <div className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded mb-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        {getStatusHint(restPingResult.status, restPingResult.error)}
                      </p>
                    </div>
                  )}
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-32">
                    {restPingResult.text || "(empty response)"}
                  </pre>
                </div>
              )}
            </div>

            {/* Auth Health */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Auth Health</span>
                  <span className="text-xs text-muted-foreground font-mono">/auth/v1/health</span>
                </div>
                <div className="flex items-center gap-2">
                  {authHealthResult && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {authHealthResult.elapsedMs}ms
                    </span>
                  )}
                  {renderStatusBadge(authHealthResult)}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAuthHealth}
                    disabled={!supabaseReady || isPingingAuth}
                  >
                    {isPingingAuth ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Test"
                    )}
                  </Button>
                </div>
              </div>
              {authHealthResult && (
                <div className="mt-2">
                  {getStatusHint(authHealthResult.status, authHealthResult.error) && (
                    <div className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded mb-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        {getStatusHint(authHealthResult.status, authHealthResult.error)}
                      </p>
                    </div>
                  )}
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-32">
                    {authHealthResult.text || "(empty response)"}
                  </pre>
                </div>
              )}
            </div>

            {/* Auth Session */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Auth Session</span>
                  <span className="text-xs text-muted-foreground">Local session check (no HTTP)</span>
                </div>
                <div className="flex items-center gap-2">
                  {sessionResult && (
                    <Badge variant={sessionResult.hasSession ? "default" : "secondary"}>
                      {sessionResult.hasSession ? "LOGGED IN" : "NO SESSION"}
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSessionCheck}
                    disabled={!supabaseReady || isCheckingSession}
                  >
                    {isCheckingSession ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Check"
                    )}
                  </Button>
                </div>
              </div>
              {sessionResult && (
                <div className="mt-2 text-xs">
                  {sessionResult.hasSession ? (
                    <div className="space-y-1">
                      <p>User ID: <span className="font-mono">{sessionResult.userId}</span></p>
                      <p>Expires: {sessionResult.expiresAt ? new Date(sessionResult.expiresAt * 1000).toLocaleString() : 'N/A'}</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No active session. Login required to access protected resources.</p>
                  )}
                  {sessionResult.error && (
                    <p className="text-destructive mt-1">{sessionResult.error}</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section C: Direct REST Table Probes */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Server className="h-5 w-5" />
                Section C: REST Table Probes
              </CardTitle>
              <CardDescription>
                Direct HTTP requests to tables (reveals real status codes)
              </CardDescription>
            </div>
            <Button
              onClick={probeAllTables}
              disabled={!supabaseReady || isProbingAll}
              size="sm"
              className="gap-2"
            >
              {isProbingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Probe All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {TABLES_TO_TEST.map((table) => {
                const probe = probeResults[table.name];
                return (
                  <div
                    key={`probe-${table.name}`}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {probe?.status === "loading" && (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      )}
                      {probe?.status === "success" && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                      {probe?.status === "error" && (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      {!probe && (
                        <Server className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">{table.label}</p>
                        <p className="text-xs font-mono text-muted-foreground">
                          /rest/v1/{table.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {probe?.elapsedMs > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {probe.elapsedMs}ms
                        </span>
                      )}
                      {probe?.httpStatus > 0 && (
                        <Badge variant={probe.httpStatus === 200 ? "default" : "destructive"}>
                          HTTP {probe.httpStatus}
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => probeTable(table.name)}
                        disabled={!supabaseReady || probe?.status === "loading"}
                      >
                        {probe?.status === "loading" ? "..." : "Probe"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Section D: Supabase-js Table Tests */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5" />
                Section D: SDK Table Queries
              </CardTitle>
              <CardDescription>
                Test via Supabase-js (30s timeout + 2 retries)
              </CardDescription>
            </div>
            <Button
              onClick={testAllTables}
              disabled={!supabaseReady || isTestingAll}
              size="sm"
              className="gap-2"
            >
              {isTestingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Test All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {TABLES_TO_TEST.map((table) => {
                const result = results[table.name];
                return (
                  <div
                    key={table.name}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {result?.status === "loading" && (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      )}
                      {result?.status === "success" && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                      {(result?.status === "error" || result?.status === "timeout") && (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      {(!result || result.status === "idle") && (
                        <Database className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">{table.label}</p>
                        <p className="text-xs font-mono text-muted-foreground">
                          {table.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {result?.elapsedMs > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {result.elapsedMs}ms
                        </span>
                      )}
                      {result?.status === "success" && (
                        <Badge variant="default">{result.rowCount} rows</Badge>
                      )}
                      {result?.status === "timeout" && (
                        <Badge variant="destructive">TIMEOUT</Badge>
                      )}
                      {result?.status === "error" && (
                        <Badge variant="destructive">ERROR</Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testTable(table.name)}
                        disabled={!supabaseReady || result?.status === "loading"}
                      >
                        {result?.status === "loading" ? "Testing..." : "Test"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Results Panel */}
        {Object.values(results).some((r) => r.status !== "idle") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Query Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.values(results)
                .filter((r) => r.status !== "idle" && r.status !== "loading")
                .map((result) => (
                  <div key={result.table} className="border rounded-lg overflow-hidden">
                    <div
                      className={`px-4 py-2 font-mono text-sm flex items-center justify-between ${
                        result.status === "success"
                          ? "bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200"
                          : "bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200"
                      }`}
                    >
                      <span>{result.table}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">{result.elapsedMs}ms</span>
                        {result.retryAttempts !== undefined && result.retryAttempts > 0 && (
                          <span className="text-xs">(retries: {result.retryAttempts})</span>
                        )}
                        <Badge
                          variant={result.status === "success" ? "default" : "destructive"}
                        >
                          {result.status === "success"
                            ? `${result.rowCount} rows`
                            : result.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-4 max-h-64 overflow-auto bg-muted/30">
                      {result.status === "success" ? (
                        <pre className="text-xs font-mono whitespace-pre-wrap">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      ) : (
                        <div>
                          <p className="text-sm text-destructive font-medium">{result.error}</p>
                          {result.status === "timeout" && (
                            <p className="text-xs text-muted-foreground mt-2">
                              The request was aborted. Run "REST Probe" above to see the actual HTTP status.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}

        {/* Debug Tips */}
        <div className="mt-8 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <p className="font-semibold mb-2">Troubleshooting Guide:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>REST Probe returns 200:</strong> Tables are accessible via REST API</li>
            <li><strong>REST Probe returns 401/403:</strong> API key invalid or RLS blocking</li>
            <li><strong>REST Probe returns 404:</strong> Table doesn't exist or schema not exposed</li>
            <li><strong>SDK Test times out but REST Probe works:</strong> Client-side issue or network</li>
            <li><strong>Warmup helps:</strong> PostgREST was cold-starting, now warmed up</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
