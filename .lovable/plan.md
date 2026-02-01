
# Complete End-to-End Fix for IQ200 RADAR

## Root Cause Analysis

### Primary Problem: Race Condition in Auth Initialization + Route Blocking

The infinite green spinner is caused by a chain of issues:

1. **Route `/` is wrapped in `PublicRoute`** which checks `isLoading` from authStore
2. **AuthInitializer calls `initialize()`** which sets up async Supabase auth
3. **`onAuthStateChange` listener is async** and may not fire synchronously
4. **While `isLoading: true`, ALL routes show `LoadingScreen` with spinner**
5. **The 5-second timeout was added but the flow still blocks rendering**

The critical flaw: The route `/` (Landing page) should NOT be blocked by auth loading. Users should see the Landing page immediately without waiting for auth.

### Secondary Issues Found

1. **Health Check at wrong route**: Health Check is at `/health` but user expects it at `/`
2. **No ErrorBoundary**: Runtime errors cause blank screen or infinite spinner
3. **Dashboard uses mock data only**: Not connected to real Supabase tables
4. **Supabase client crashes on missing env**: `createClient()` throws if URL/Key are undefined
5. **No connection status exports**: Other components can't check if Supabase is ready

---

## Implementation Plan

### Phase 1: Stop the Infinite Spinner (Make UI Always Render)

**Changes to `src/App.tsx`:**

```text
1. Move Landing page OUTSIDE PublicRoute wrapper (no auth check needed)
2. Add ErrorBoundary component around the app root
3. Make /health route the health check (keep it outside auth)
4. Ensure fallback UI renders even if auth times out
```

**New behavior:**
- `/` renders Landing immediately without waiting for auth
- `/health` renders Health Check immediately without waiting for auth
- Other routes wait for auth but show timeout after 5 seconds

### Phase 2: Implement Safe Supabase Client

**Changes to `src/integrations/supabase/client.ts`:**

Since this file is auto-generated and should NOT be edited, we will create a **wrapper module** instead:

**New file: `src/lib/supabaseHelpers.ts`**

```text
Purpose: Safe wrapper around supabase client
Exports:
- supabaseReady: boolean - true if env vars present
- getSupabaseEnvStatus(): { hasUrl, hasKey, urlMasked }
- safeQuery(): wrapper that handles errors gracefully
```

This approach respects the auto-generated client while adding safety utilities.

### Phase 3: Enhanced Health Check at `/health`

**Changes to `src/pages/Index.tsx`:**

```text
Current: Basic health check with one "Test DB" button
New:
- Show Supabase client status (READY/NOT READY)
- Multiple test buttons for different tables
- Query timeout (8 seconds)
- Clear instructions for env var setup
- Link to go to Dashboard if tests pass
- Table showing actual row counts
```

### Phase 4: Dashboard Connected to Real Data

**Changes to `src/pages/Dashboard.tsx`:**

```text
Current: Uses generateFundingRates() and other mock functions
New:
1. Keep mock data as fallback
2. Add useEffect to fetch real data from Supabase:
   - computed_metrics_v2 table
   - funding_rates table (fallback)
   - trading_signals table
3. Merge real data with mock data (real data first, mock fills gaps)
4. Show loading skeletons while fetching
5. Add "Data Source" indicator (Real DB / Mock)
6. Auto-refresh every 30 seconds
7. Handle empty tables gracefully ("No data yet")
```

### Phase 5: Ensure Routing Does Not Block `/`

**File: `src/App.tsx` routing changes:**

```text
Before:
  <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />

After:
  <Route path="/" element={<Landing />} />  // No wrapper - always renders

Keep PublicRoute for /login and /register only.
```

### Phase 6: Data Shape Tolerance

**Dashboard rendering changes:**

```text
- Use optional chaining for all data fields
- Show "N/A" for missing values
- Generic JSON table fallback if schema differs
- Never crash on undefined/null
```

---

## Technical Details

### File: src/App.tsx (Modified)

Key changes:
1. Add ErrorBoundary class component
2. Remove PublicRoute from `/` route
3. Keep `/health` outside auth
4. Wrap Routes in ErrorBoundary

### File: src/lib/supabaseHelpers.ts (New)

```typescript
import { supabase } from '@/integrations/supabase/client';

// Check if env vars are present
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabaseReady = !!(SUPABASE_URL && SUPABASE_KEY);

export function getSupabaseEnvStatus() {
  return {
    hasUrl: !!SUPABASE_URL,
    hasKey: !!SUPABASE_KEY,
    urlMasked: SUPABASE_URL ? `${SUPABASE_URL.slice(0, 20)}...` : 'NOT SET',
  };
}

// Safe query wrapper with timeout
export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  timeoutMs = 8000
): Promise<{ data: T | null; error: string | null; timedOut: boolean }> {
  if (!supabaseReady) {
    return { data: null, error: 'Supabase not configured', timedOut: false };
  }
  
  try {
    const result = await Promise.race([
      queryFn(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Request timed out')), timeoutMs)
      ),
    ]);
    
    if (result.error) {
      return { data: null, error: result.error.message, timedOut: false };
    }
    return { data: result.data, error: null, timedOut: false };
  } catch (err: any) {
    const timedOut = err.message === 'Request timed out';
    return { data: null, error: err.message, timedOut };
  }
}
```

### File: src/pages/Index.tsx (Enhanced Health Check)

Key changes:
1. Show Supabase READY/NOT READY status
2. Multiple test buttons for tables
3. Show row counts
4. Clear error display with full details
5. Timeout handling
6. Instructions panel

### File: src/pages/Dashboard.tsx (Real Data Integration)

Key changes:
1. Add state for real data: `realMetrics`, `realSignals`
2. Add `isLoadingRealData` state
3. useEffect to fetch on mount and every 30s
4. Merge logic: show real data first, fill with mock
5. Data source indicator badge
6. Skeleton loaders during fetch

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/App.tsx` | Modify | Add ErrorBoundary, fix routing for `/` |
| `src/lib/supabaseHelpers.ts` | Create | Safe wrapper with env checks and timeout |
| `src/pages/Index.tsx` | Modify | Enhanced Health Check with multiple tests |
| `src/pages/Dashboard.tsx` | Modify | Connect to real Supabase data |

---

## Verification Steps (60 seconds)

1. **Open `/`** - Should show Landing page IMMEDIATELY (no spinner)
2. **Open `/health`** - Should show Health Check with env status (both should be OK)
3. **Click "Test: symbols"** - Should show JSON with 20 rows
4. **Click "Test: exchanges"** - Should show JSON with 8 rows
5. **Open `/dashboard`** (login first) - Should show data (mock with "No real data yet" indicator initially)

---

## If Still Failing: Debug Checklist

1. Open browser DevTools (F12) -> Console tab
2. Look for errors containing "supabase" or "createClient"
3. Check Network tab -> filter "supabase.co" -> look for 401/403/500 errors
4. On `/health`, verify both env vars show "OK"
5. If env vars show "MISSING":
   - Check `.env` file exists in project root
   - Values should NOT have quotes around them
   - Hard refresh (Ctrl+Shift+R)
   - Click "Rebuild" in Lovable editor
6. Check if RLS policies might be blocking queries (profiles table, etc.)
