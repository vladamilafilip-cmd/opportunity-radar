import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Database, Loader2, ArrowRight, RefreshCw } from "lucide-react";

export default function HealthCheck() {
  const [status, setStatus] = useState<"loading" | "connected" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [rowCount, setRowCount] = useState<number | null>(null);

  const checkConnection = async () => {
    setStatus("loading");
    setError(null);
    
    try {
      const { data, error: queryError } = await supabase
        .from("symbols")
        .select("id")
        .limit(5);

      if (queryError) {
        setStatus("error");
        setError(queryError.message);
        return;
      }

      setRowCount(data?.length ?? 0);
      setStatus("connected");
    } catch (e: any) {
      setStatus("error");
      setError(e.message || "Connection failed");
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const envOk = !!import.meta.env.VITE_SUPABASE_URL && 
                !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Diadonum</CardTitle>
          <p className="text-muted-foreground">System Health Check</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Environment Check */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span>Environment Variables</span>
            <Badge variant={envOk ? "default" : "destructive"}>
              {envOk ? "OK" : "MISSING"}
            </Badge>
          </div>

          {/* Database Check */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span>Database</span>
            </div>
            {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
            {status === "connected" && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <Badge variant="default">Connected ({rowCount} rows)</Badge>
              </div>
            )}
            {status === "error" && (
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <Badge variant="destructive">Error</Badge>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={checkConnection}
              disabled={status === "loading"}
              className="flex-1 gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${status === "loading" ? "animate-spin" : ""}`} />
              Retry
            </Button>
            {status === "connected" && (
              <Link to="/dashboard" className="flex-1">
                <Button className="w-full gap-2">
                  Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
