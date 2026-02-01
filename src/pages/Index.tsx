import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Database, Loader2 } from "lucide-react";

export default function HealthCheck() {
  const [dbResult, setDbResult] = useState<string | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const testDatabase = async () => {
    setIsLoading(true);
    setDbError(null);
    setDbResult(null);

    try {
      // Primary query: computed_metrics_v2
      const { data, error } = await supabase
        .from("computed_metrics_v2")
        .select("*")
        .limit(1);

      if (error) throw error;
      setDbResult(JSON.stringify(data, null, 2));
    } catch (primaryErr: unknown) {
      console.warn("Primary query failed, trying fallback:", primaryErr);
      // Fallback query: symbols table
      try {
        const { data, error } = await supabase
          .from("symbols")
          .select("*")
          .limit(1);

        if (error) throw error;
        setDbResult(JSON.stringify(data, null, 2));
      } catch (fallbackErr: unknown) {
        const errorMessage = fallbackErr instanceof Error ? fallbackErr.message : "Unknown error";
        setDbError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-foreground">
          System Health Check
        </h1>

        {/* Environment Variables Status */}
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <h2 className="text-lg font-semibold mb-3 text-foreground">
            Environment Variables
          </h2>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex items-center gap-2">
              {url ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="text-muted-foreground">VITE_SUPABASE_URL:</span>
              <span className={url ? "text-green-600" : "text-red-600"}>
                {url ? "OK" : "MISSING"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {key ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="text-muted-foreground">
                VITE_SUPABASE_PUBLISHABLE_KEY:
              </span>
              <span className={key ? "text-green-600" : "text-red-600"}>
                {key ? "OK" : "MISSING"}
              </span>
            </div>
          </div>
        </div>

        {/* Database Test */}
        <div className="mb-6">
          <Button
            onClick={testDatabase}
            disabled={isLoading || !url || !key}
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            {isLoading ? "Testing..." : "Test DB Connection"}
          </Button>
        </div>

        {/* Success Result */}
        {dbResult && (
          <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <h3 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">
              ✓ Database Connection Successful
            </h3>
            <pre className="overflow-auto text-xs text-green-700 dark:text-green-300 max-h-64">
              {dbResult}
            </pre>
          </div>
        )}

        {/* Error Result */}
        {dbError && (
          <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
              ✗ Database Connection Failed
            </h3>
            <pre className="overflow-auto text-xs text-red-700 dark:text-red-300">
              Error: {dbError}
            </pre>
          </div>
        )}

        {/* Debug Info */}
        <div className="mt-8 p-4 bg-muted/50 rounded-lg text-xs text-muted-foreground">
          <p className="font-semibold mb-2">Debug Tips:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>If env vars show MISSING, try a hard refresh (Ctrl+Shift+R)</li>
            <li>Check browser console (F12) for detailed errors</li>
            <li>If still broken, use "Rebuild" button in Lovable editor</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
