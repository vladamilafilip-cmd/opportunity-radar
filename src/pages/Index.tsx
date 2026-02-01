import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  supabaseReady, 
  getSupabaseEnvStatus, 
  safeQuery, 
  restPing, 
  restWhoAmI,
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
  Clock
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

type TestResult = {
  table: string;
  status: "idle" | "loading" | "success" | "error" | "timeout";
  data: any[] | null;
  error: string | null;
  rowCount: number;
  elapsedMs: number;
};

const TABLES_TO_TEST = [
  { name: "symbols", label: "Symbols" },
  { name: "exchanges", label: "Exchanges" },
  { name: "computed_metrics_v2", label: "Computed Metrics V2" },
  { name: "trading_signals", label: "Trading Signals" },
  { name: "funding_rates", label: "Funding Rates" },
];

export default function HealthCheck() {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [restPingResult, setRestPingResult] = useState<PingResult>(null);
  const [authPingResult, setAuthPingResult] = useState<PingResult>(null);
  const [isPingingRest, setIsPingingRest] = useState(false);
  const [isPingingAuth, setIsPingingAuth] = useState(false);
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

  // Auth Ping test
  const handleAuthPing = async () => {
    setIsPingingAuth(true);
    setAuthPingResult(null);
    const result = await restWhoAmI();
    setAuthPingResult(result);
    setIsPingingAuth(false);
  };

  // Table query test
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
          error: `Request aborted after ${result.elapsedMs}ms`,
          rowCount: 0,
          elapsedMs: result.elapsedMs,
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
      authPing: authPingResult,
      tableTests: Object.values(results).map(r => ({
        table: r.table,
        status: r.status,
        rowCount: r.rowCount,
        elapsedMs: r.elapsedMs,
        error: r.error,
      })),
    };

    navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2)).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  }, [envStatus, restPingResult, authPingResult, results]);

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

            {/* Auth Ping */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Auth Ping</span>
                  <span className="text-xs text-muted-foreground font-mono">/auth/v1/user</span>
                </div>
                <div className="flex items-center gap-2">
                  {authPingResult && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {authPingResult.elapsedMs}ms
                    </span>
                  )}
                  {renderStatusBadge(authPingResult)}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAuthPing}
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
              {authPingResult && (
                <div className="mt-2">
                  {getStatusHint(authPingResult.status, authPingResult.error) && (
                    <div className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded mb-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        {getStatusHint(authPingResult.status, authPingResult.error)}
                      </p>
                    </div>
                  )}
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-32">
                    {authPingResult.text || "(empty response)"}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section C: Database Tests */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5" />
                Section C: Table Queries
              </CardTitle>
              <CardDescription>
                Test actual database queries via Supabase SDK
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
              Test All Tables
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
                              The request was aborted due to timeout. Try running REST Ping above to check network connectivity.
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
            <li><strong>REST Ping returns 401/403:</strong> API key is invalid or disabled</li>
            <li><strong>REST Ping returns 404:</strong> Project URL is incorrect</li>
            <li><strong>REST Ping shows NETWORK_ERROR:</strong> CORS blocked or URL unreachable</li>
            <li><strong>Tables timeout but REST Ping works:</strong> RLS policies may be blocking</li>
            <li><strong>Env vars show MISSING:</strong> Hard refresh (Ctrl+Shift+R) or rebuild preview</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
