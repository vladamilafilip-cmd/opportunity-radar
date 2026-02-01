

# Production Stabilization Plan

## Root Cause Analysis

After thorough analysis of the codebase, I've identified the **critical issue** causing timeouts and instability:

### The Problem: `src/lib/supabaseHelpers.ts`

This file contains custom fetch wrappers (`fetchWithAbort`), manual REST calls (`restPing`, `restTableProbe`, `warmup`), and a `safeQuery` wrapper with retry logic. While well-intentioned for debugging, these patterns:

1. **Add latency** - Custom fetch wrapper introduces overhead
2. **Mask real errors** - Wrapping supabase-js obscures actual SDK error messages  
3. **Create complexity** - Multiple code paths for what should be simple SDK calls
4. **Bypass SDK optimizations** - The supabase-js client already handles retries, connection pooling, and error handling internally

### Current Architecture Issues

| File | Issue |
|------|-------|
| `src/lib/supabaseHelpers.ts` | 466 lines of custom fetch wrappers, manual REST calls, retry logic |
| `src/pages/Index.tsx` | 814 lines - overly complex health check with manual HTTP probes |
| `src/pages/Dashboard.tsx` | Uses `safeQuery` wrapper instead of direct SDK calls |
| `src/integrations/supabase/client.ts` | **CORRECT** - Clean SDK client, should NOT be modified |

### What's Working Correctly
- ✅ `src/integrations/supabase/client.ts` - Standard SDK initialization (auto-generated, correct)
- ✅ `src/store/authStore.ts` - Uses SDK directly for auth
- ✅ `supabase/functions/run-metrics-engine/index.ts` - Proper edge function (not for simple reads)

---

## Implementation Plan

### Phase 1: Delete Custom Network Wrappers

**Delete file**: `src/lib/supabaseHelpers.ts` (entire file)

This file contains:
- `fetchWithAbort()` - Custom fetch wrapper with AbortController
- `restPing()` - Manual REST endpoint call
- `authHealth()` - Manual auth endpoint call  
- `restTableProbe()` - Manual table REST call
- `warmup()` - Manual connection warmup
- `safeQuery()` - Wrapper around SDK queries with retry/timeout logic

All of these should be removed. The Supabase SDK handles networking internally.

### Phase 2: Create Simple Health Check Utility

**Create file**: `src/lib/supabaseHealth.ts`

```typescript
import { supabase } from "@/integrations/supabase/client";

export async function checkSupabase(): Promise<{
  connected: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase
      .from("symbols")
      .select("id")
      .limit(1);
    
    if (error) {
      return { connected: false, error: error.message };
    }
    return { connected: true };
  } catch (e: any) {
    return { connected: false, error: e.message };
  }
}
```

### Phase 3: Simplify Health Check Page

**Rewrite file**: `src/pages/Index.tsx`

Replace 814-line complex diagnostic page with simple, functional health check:

```typescript
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Database, Loader2, ArrowRight } from "lucide-react";

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
          <CardTitle className="text-2xl">IQ200 RADAR</CardTitle>
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
              <Badge variant="destructive">Error</Badge>
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
              className="flex-1"
            >
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
```

### Phase 4: Simplify Dashboard Data Fetching

**Modify file**: `src/pages/Dashboard.tsx`

Remove `safeQuery` wrapper, use direct SDK calls:

```typescript
// BEFORE (remove this pattern):
const result = await safeQuery(async () =>
  await supabase.from("computed_metrics_v2").select("*").limit(50)
);

// AFTER (use direct SDK):
const { data, error } = await supabase
  .from("computed_metrics_v2")
  .select("*")
  .order("ts", { ascending: false })
  .limit(50);

if (error) {
  console.error("Metrics error:", error.message);
}
```

Key changes:
- Remove import of `safeQuery` from supabaseHelpers
- Remove import of `supabaseReady` check (SDK handles this)
- Use direct `supabase.from().select()` calls
- Handle errors inline with simple try/catch
- Keep auto-refresh with `setInterval` + cleanup

### Phase 5: Verify No Other Issues

**Keep unchanged** (these are correct):
- `src/integrations/supabase/client.ts` - Auto-generated, correct
- `src/store/authStore.ts` - Uses SDK correctly
- `supabase/functions/run-metrics-engine/index.ts` - Proper edge function for background processing

---

## Files Summary

| Action | File | Reason |
|--------|------|--------|
| **DELETE** | `src/lib/supabaseHelpers.ts` | Custom fetch wrappers causing issues |
| **CREATE** | `src/lib/supabaseHealth.ts` | Simple 20-line health utility |
| **REWRITE** | `src/pages/Index.tsx` | Replace 814 lines with ~80 lines clean code |
| **MODIFY** | `src/pages/Dashboard.tsx` | Remove safeQuery, use direct SDK |
| **KEEP** | `src/integrations/supabase/client.ts` | Already correct (auto-generated) |
| **KEEP** | `src/store/authStore.ts` | Already uses SDK correctly |

---

## Expected Results After Implementation

| Before | After |
|--------|-------|
| 30s timeout with custom AbortController | Direct SDK calls (no timeout issues) |
| Complex retry logic in wrapper | SDK handles retries internally |
| Manual REST endpoint probes | SDK manages connections |
| 814-line health check page | ~80 lines, clean and functional |
| `safeQuery` wrapper in Dashboard | Direct `supabase.from().select()` |

---

## Verification Steps

1. **Load `/health`** - Should show "Connected" within 1-2 seconds
2. **Load `/dashboard`** - Should show data (real or mock fallback) immediately
3. **No console errors** - Clean network requests through SDK
4. **No infinite spinners** - Direct SDK calls resolve quickly

---

## Technical Notes

### Why Supabase SDK is Sufficient

The `@supabase/supabase-js` client already includes:
- Connection pooling
- Automatic retries for transient errors
- Token refresh
- Error handling with detailed messages
- CORS handling via proxy

### Why Custom Wrappers Cause Problems

1. **Race conditions** - Multiple abort controllers can conflict
2. **Hidden errors** - Wrapped errors lose context
3. **Memory leaks** - AbortController timeouts may not clean up
4. **Latency** - Extra promise wrapping adds overhead

