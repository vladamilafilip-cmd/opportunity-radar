import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { supabaseReady, getSupabaseEnvStatus, safeQuery } from "@/lib/supabaseHelpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Database, Loader2, RefreshCw, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

type TestResult = {
  table: string;
  status: "idle" | "loading" | "success" | "error" | "timeout";
  data: any[] | null;
  error: string | null;
  rowCount: number;
};

const TABLES_TO_TEST = [
  { name: "symbols", label: "Symbols" },
  { name: "exchanges", label: "Exchanges" },
  { name: "computed_metrics_v2", label: "Computed Metrics" },
  { name: "trading_signals", label: "Trading Signals" },
  { name: "funding_rates", label: "Funding Rates" },
];

export default function HealthCheck() {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [isTestingAll, setIsTestingAll] = useState(false);

  const envStatus = getSupabaseEnvStatus();

  const testTable = async (tableName: string) => {
    setResults((prev) => ({
      ...prev,
      [tableName]: { table: tableName, status: "loading", data: null, error: null, rowCount: 0 },
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
          error: "Request timed out after 8 seconds",
          rowCount: 0,
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

  const allTestsPassed = TABLES_TO_TEST.every(
    (t) => results[t.name]?.status === "success"
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              System Health Check
            </h1>
            <p className="text-muted-foreground mt-1">
              Verify environment and database connectivity
            </p>
          </div>
          {allTestsPassed && (
            <Link to="/dashboard">
              <Button className="gap-2">
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>

        {/* Environment Variables Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Environment Variables</CardTitle>
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
                    </p>
                  </div>
                </div>
                <Badge variant={envStatus.hasKey ? "default" : "destructive"}>
                  {envStatus.hasKey ? "OK" : "MISSING"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Supabase Client Status */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Supabase Client</CardTitle>
            <Badge variant={supabaseReady ? "default" : "destructive"} className="text-sm">
              {supabaseReady ? "READY" : "NOT READY"}
            </Badge>
          </CardHeader>
          <CardContent>
            {!supabaseReady ? (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-destructive font-medium mb-2">
                  Supabase client is not configured
                </p>
                <p className="text-sm text-muted-foreground">
                  Please ensure both environment variables are set. After setting them,
                  refresh the page or rebuild the preview.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Client is ready. Click the buttons below to test database connectivity.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Database Tests */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Connectivity
            </CardTitle>
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
                      {result?.status === "success" && (
                        <span className="text-sm text-muted-foreground">
                          {result.rowCount} rows
                        </span>
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
                      <Badge
                        variant={result.status === "success" ? "default" : "destructive"}
                      >
                        {result.status === "success"
                          ? `${result.rowCount} rows`
                          : result.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="p-4 max-h-64 overflow-auto bg-muted/30">
                      {result.status === "success" ? (
                        <pre className="text-xs font-mono whitespace-pre-wrap">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      ) : (
                        <p className="text-sm text-destructive">{result.error}</p>
                      )}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}

        {/* Debug Tips */}
        <div className="mt-8 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <p className="font-semibold mb-2">Debug Tips:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>If env vars show MISSING, try a hard refresh (Ctrl+Shift+R)</li>
            <li>Check browser console (F12) for detailed errors</li>
            <li>If tests fail with permissions errors, check RLS policies</li>
            <li>Use the "Rebuild" button in Lovable editor if issues persist</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
