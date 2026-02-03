import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  Database, 
  Loader2, 
  ArrowRight, 
  RefreshCw,
  Shield,
  Zap,
  HardDrive,
  AlertTriangle,
  Bot,
  Clock,
  TrendingUp,
  FileText
} from "lucide-react";

type CheckStatus = "loading" | "ok" | "error" | "warning";

interface HealthCheck {
  name: string;
  icon: React.ReactNode;
  status: CheckStatus;
  message?: string;
  detail?: string;
}

export default function HealthCheck() {
  const [checks, setChecks] = useState<HealthCheck[]>([
    { name: "Environment Variables", icon: <Shield className="h-4 w-4" />, status: "loading" },
    { name: "Database Connection", icon: <Database className="h-4 w-4" />, status: "loading" },
    { name: "Auth Service", icon: <Shield className="h-4 w-4" />, status: "loading" },
    { name: "Edge Functions", icon: <Zap className="h-4 w-4" />, status: "loading" },
    { name: "Storage", icon: <HardDrive className="h-4 w-4" />, status: "loading" },
    { name: "Autopilot Worker", icon: <Bot className="h-4 w-4" />, status: "loading" },
    { name: "Open Positions", icon: <TrendingUp className="h-4 w-4" />, status: "loading" },
    { name: "Audit Log", icon: <FileText className="h-4 w-4" />, status: "loading" },
  ]);

  const updateCheck = (name: string, update: Partial<HealthCheck>) => {
    setChecks(prev => prev.map(c => c.name === name ? { ...c, ...update } : c));
  };

  const runAllChecks = async () => {
    // Reset all to loading
    setChecks(prev => prev.map(c => ({ ...c, status: "loading" as CheckStatus, message: undefined, detail: undefined })));

    // 1. Environment Variables Check
    const envOk = !!import.meta.env.VITE_SUPABASE_URL && 
                  !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    updateCheck("Environment Variables", {
      status: envOk ? "ok" : "error",
      message: envOk ? "All required variables set" : "Missing SUPABASE_URL or KEY",
    });

    // 2. Database Connection Check
    try {
      const { data, error } = await supabase
        .from("symbols")
        .select("id")
        .limit(5);

      if (error) {
        updateCheck("Database Connection", {
          status: "error",
          message: "Query failed",
          detail: error.message,
        });
      } else {
        updateCheck("Database Connection", {
          status: "ok",
          message: `Connected (${data?.length ?? 0} rows returned)`,
        });
      }
    } catch (e: any) {
      updateCheck("Database Connection", {
        status: "error",
        message: "Connection failed",
        detail: e.message,
      });
    }

    // 3. Auth Service Check
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        updateCheck("Auth Service", {
          status: "error",
          message: "Auth error",
          detail: error.message,
        });
      } else {
        updateCheck("Auth Service", {
          status: "ok",
          message: session ? `Logged in as ${session.user.email}` : "Service available (not logged in)",
        });
      }
    } catch (e: any) {
      updateCheck("Auth Service", {
        status: "error",
        message: "Auth service unreachable",
        detail: e.message,
      });
    }

    // 4. Edge Functions Check
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-metrics-engine`,
        {
          method: "OPTIONS",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      
      // OPTIONS returning 200 or 204 means endpoint exists
      if (response.ok || response.status === 204) {
        updateCheck("Edge Functions", {
          status: "ok",
          message: "Endpoints reachable",
        });
      } else if (response.status === 401 || response.status === 403) {
        // Auth required means endpoint exists
        updateCheck("Edge Functions", {
          status: "ok",
          message: "Endpoints available (auth required)",
        });
      } else {
        updateCheck("Edge Functions", {
          status: "warning",
          message: `Endpoint returned ${response.status}`,
        });
      }
    } catch (e: any) {
      updateCheck("Edge Functions", {
        status: "warning",
        message: "Could not verify",
        detail: "CORS or network issue",
      });
    }

    // 5. Storage Check
    try {
      const { data, error } = await supabase.storage.listBuckets();
      
      if (error) {
        if (error.message.includes("not authorized") || error.message.includes("permission")) {
          updateCheck("Storage", {
            status: "ok",
            message: "Service available (no public buckets)",
          });
        } else {
          updateCheck("Storage", {
            status: "warning",
            message: "Limited access",
            detail: error.message,
          });
        }
      } else {
        updateCheck("Storage", {
          status: "ok",
          message: data.length > 0 ? `${data.length} bucket(s) available` : "No buckets configured",
        });
      }
    } catch (e: any) {
      updateCheck("Storage", {
        status: "error",
        message: "Storage unreachable",
        detail: e.message,
      });
    }

    // 6. Autopilot Worker Check
    try {
      const { data: state } = await supabase
        .from("autopilot_state")
        .select("last_scan_ts, is_running, kill_switch_active, mode")
        .limit(1)
        .maybeSingle();

      if (state?.last_scan_ts) {
        const lastScan = new Date(state.last_scan_ts);
        const minutesAgo = (Date.now() - lastScan.getTime()) / 60000;
        
        if (state.kill_switch_active) {
          updateCheck("Autopilot Worker", {
            status: "error",
            message: "Kill switch active",
            detail: "Manual intervention required",
          });
        } else if (minutesAgo < 5) {
          updateCheck("Autopilot Worker", {
            status: "ok",
            message: state.is_running ? "Running" : `Idle (${state.mode} mode)`,
          });
        } else {
          updateCheck("Autopilot Worker", {
            status: "warning",
            message: `Last seen ${Math.round(minutesAgo)}m ago`,
          });
        }
      } else {
        updateCheck("Autopilot Worker", {
          status: "warning",
          message: "No data yet",
          detail: "Worker may not be running",
        });
      }
    } catch (e: any) {
      updateCheck("Autopilot Worker", {
        status: "warning",
        message: "Could not check",
        detail: e.message,
      });
    }

    // 7. Open Positions Check
    try {
      const { data: positions, error } = await supabase
        .from("autopilot_positions")
        .select("id, status, unrealized_pnl_eur")
        .eq("status", "open");

      if (error) {
        updateCheck("Open Positions", {
          status: "warning",
          message: "Could not fetch",
          detail: error.message,
        });
      } else {
        const count = positions?.length || 0;
        const totalPnl = positions?.reduce((sum, p) => sum + (p.unrealized_pnl_eur || 0), 0) || 0;
        updateCheck("Open Positions", {
          status: "ok",
          message: `${count} open positions`,
          detail: totalPnl !== 0 ? `PnL: €${totalPnl.toFixed(2)}` : undefined,
        });
      }
    } catch (e: any) {
      updateCheck("Open Positions", {
        status: "warning",
        message: "Check failed",
        detail: e.message,
      });
    }

    // 8. Audit Log Check
    try {
      const { data: logs, error } = await supabase
        .from("autopilot_audit_log")
        .select("id, ts, level")
        .order("ts", { ascending: false })
        .limit(10);

      if (error) {
        updateCheck("Audit Log", {
          status: "warning",
          message: "Could not fetch",
          detail: error.message,
        });
      } else {
        const errorCount = logs?.filter(l => l.level === 'error').length || 0;
        if (errorCount > 0) {
          updateCheck("Audit Log", {
            status: "warning",
            message: `${errorCount} recent errors`,
          });
        } else {
          updateCheck("Audit Log", {
            status: "ok",
            message: `${logs?.length || 0} recent entries`,
          });
        }
      }
    } catch (e: any) {
      updateCheck("Audit Log", {
        status: "warning",
        message: "Check failed",
        detail: e.message,
      });
    }
  };

  useEffect(() => {
    runAllChecks();
  }, []);

  const allOk = checks.every(c => c.status === "ok" || c.status === "warning");
  const hasErrors = checks.some(c => c.status === "error");
  const isLoading = checks.some(c => c.status === "loading");

  const getStatusIcon = (status: CheckStatus) => {
    switch (status) {
      case "loading":
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      case "ok":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusBadge = (status: CheckStatus) => {
    switch (status) {
      case "loading":
        return <Badge variant="secondary">Checking...</Badge>;
      case "ok":
        return <Badge className="bg-success/20 text-success border-success/30">OK</Badge>;
      case "warning":
        return <Badge className="bg-warning/20 text-warning border-warning/30">Warning</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Diadonum</CardTitle>
          <p className="text-muted-foreground">System Health Check</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {checks.map((check) => (
            <div key={check.name} className="p-3 bg-muted/50 rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {check.icon}
                  <span className="font-medium">{check.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(check.status)}
                  {getStatusBadge(check.status)}
                </div>
              </div>
              {check.message && (
                <p className="text-sm text-muted-foreground pl-6">{check.message}</p>
              )}
              {check.detail && (
                <p className="text-xs text-destructive pl-6">{check.detail}</p>
              )}
            </div>
          ))}

          {/* Summary */}
          <div className={`p-3 rounded-lg border ${
            hasErrors 
              ? "bg-destructive/10 border-destructive/30" 
              : allOk && !isLoading
                ? "bg-success/10 border-success/30"
                : "bg-muted border-border"
          }`}>
            <p className={`text-sm font-medium ${
              hasErrors ? "text-destructive" : allOk && !isLoading ? "text-success" : "text-muted-foreground"
            }`}>
              {isLoading 
                ? "Running health checks..." 
                : hasErrors 
                  ? "Some services have issues" 
                  : "All systems operational"}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={runAllChecks}
              disabled={isLoading}
              className="flex-1 gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Retry All
            </Button>
            {allOk && !isLoading && (
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
