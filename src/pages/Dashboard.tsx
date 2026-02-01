import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RiskBadge } from "@/components/RiskBadge";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { UserDataBanner } from "@/components/UserDataBanner";
import { LastUpdated } from "@/components/LastUpdated";
import {
  generateFundingRates,
  generateFundingArbitrage,
  generatePriceArbitrage,
  generateOpportunities,
} from "@/lib/mockData";
import { 
  Radar, 
  TrendingUp, 
  ArrowLeftRight, 
  LineChart, 
  User,
  Settings,
  LogOut,
  CreditCard,
  ShieldCheck,
  Star,
  Database,
  AlertCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type DataSource = "live" | "mock" | "mixed";

export default function Dashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataSource, setDataSource] = useState<DataSource>("mock");
  const [isLoadingRealData, setIsLoadingRealData] = useState(true);
  
  // Real data from Supabase
  const [realMetrics, setRealMetrics] = useState<any[]>([]);
  const [realSignals, setRealSignals] = useState<any[]>([]);
  const [realFundingRates, setRealFundingRates] = useState<any[]>([]);
  
  // Mock data as fallback
  const [mockFundingRates] = useState(generateFundingRates());
  const [mockFundingArbs] = useState(generateFundingArbitrage());
  const [mockPriceArbs] = useState(generatePriceArbitrage());
  const [mockOpportunities] = useState(generateOpportunities());

  // Fetch real data from Supabase using direct SDK calls
  const fetchRealData = useCallback(async () => {
    setIsLoadingRealData(true);

    try {
      // Parallel fetch using direct SDK calls with joins for proper display
      const [metricsResult, signalsResult] = await Promise.all([
        supabase
          .from("computed_metrics_v2")
          .select(`
            *,
            symbols:symbol_id (display_name),
            exchanges:exchange_id (code, name)
          `)
          .order("ts", { ascending: false })
          .limit(50),
        supabase
          .from("trading_signals")
          .select(`
            *,
            symbols:symbol_id (display_name)
          `)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      const hasRealMetrics = metricsResult.data && metricsResult.data.length > 0;
      const hasRealSignals = signalsResult.data && signalsResult.data.length > 0;

      if (hasRealMetrics) setRealMetrics(metricsResult.data);
      if (hasRealSignals) setRealSignals(signalsResult.data);
      
      // Use metrics for funding rates display (has all needed info)
      if (hasRealMetrics) setRealFundingRates(metricsResult.data);

      // Log any errors for debugging
      if (metricsResult.error) console.error("Metrics error:", metricsResult.error.message);
      if (signalsResult.error) console.error("Signals error:", signalsResult.error.message);

      // Determine data source
      if (hasRealMetrics || hasRealSignals) {
        setDataSource(hasRealMetrics && hasRealSignals ? "live" : "mixed");
      } else {
        setDataSource("mock");
      }
    } catch (e: any) {
      console.error("Data fetch error:", e.message);
      setDataSource("mock");
    }

    setLastUpdate(new Date());
    setIsLoadingRealData(false);
  }, []);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchRealData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchRealData, 30000);
    return () => clearInterval(interval);
  }, [fetchRealData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchRealData();
    setIsRefreshing(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Get display data (real or mock fallback)
  const displayFundingRates = realFundingRates.length > 0 
    ? realFundingRates.map((fr: any) => ({
        exchange: fr.exchanges?.name || fr.exchanges?.code || 'Unknown',
        symbol: fr.symbols?.display_name || 'Unknown',
        fundingRate: (fr.funding_rate_8h || 0) * 100, // Convert to percentage
        spreadBps: fr.spread_bps ?? 0,
        totalCostBps: fr.total_cost_bps ?? 0,
        liquidityScore: fr.liquidity_score ?? 0,
        markPrice: fr.mark_price ?? 0,
        volume24h: fr.volume_24h ?? 0,
        riskTier: Math.abs(fr.funding_rate_8h || 0) > 0.001 ? 'high' : Math.abs(fr.funding_rate_8h || 0) > 0.0003 ? 'medium' : 'safe' as const,
      }))
    : mockFundingRates;

  const displaySignals = realSignals.length > 0
    ? realSignals.map((sig: any) => ({
        id: sig.id,
        symbol: sig.symbols?.display_name || 'Unknown',
        type: sig.signal_type || 'funding_arbitrage',
        longExchange: sig.long_exchange || 'Unknown',
        shortExchange: sig.short_exchange || 'Unknown',
        score: sig.score || 0,
        confidence: sig.confidence || 0,
        netProfit: sig.net_profit_estimate_percent || 0,
        riskTier: sig.score > 80 ? 'safe' : sig.score > 60 ? 'medium' : 'high' as const,
      }))
    : mockFundingArbs;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="/favicon.jpg" 
              alt="Diadonum" 
              className="h-9 w-9 rounded-lg object-cover"
            />
            <span className="text-lg font-bold hidden sm:inline">Diadonum</span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Data Source Indicator */}
            <Badge 
              variant={dataSource === "live" ? "default" : dataSource === "mixed" ? "secondary" : "outline"}
              className="gap-1 hidden sm:flex"
            >
              <Database className="h-3 w-3" />
              {dataSource === "live" ? "Live Data" : dataSource === "mixed" ? "Mixed Data" : "Mock Data"}
            </Badge>

            <LastUpdated 
              timestamp={lastUpdate} 
              isRefreshing={isRefreshing || isLoadingRealData}
              onRefresh={handleRefresh}
            />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{user?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  <p className="text-xs text-primary mt-1 uppercase">{user?.plan} Plan</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/trading" className="cursor-pointer">
                    <LineChart className="h-4 w-4 mr-2" />
                    Paper Trading
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/billing" className="cursor-pointer">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Billing
                  </Link>
                </DropdownMenuItem>
                {user?.isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="cursor-pointer">
                      <ShieldCheck className="h-4 w-4 mr-2" />
                      Admin Panel
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="cursor-pointer">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/" className="cursor-pointer">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Health Check
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <UserDataBanner />
        <DisclaimerBanner />
        
        
        <Tabs defaultValue="funding" className="mt-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="funding" className="gap-2">
              <TrendingUp className="h-4 w-4 hidden sm:inline" />
              Funding
            </TabsTrigger>
            <TabsTrigger value="funding-arb" className="gap-2">
              <ArrowLeftRight className="h-4 w-4 hidden sm:inline" />
              Funding Arb
            </TabsTrigger>
            <TabsTrigger value="price-arb" className="gap-2">
              <LineChart className="h-4 w-4 hidden sm:inline" />
              Price Arb
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="gap-2">
              <Star className="h-4 w-4 hidden sm:inline" />
              Top Opps
            </TabsTrigger>
          </TabsList>

          {/* Funding Rates Tab */}
          <TabsContent value="funding" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Funding Rates
                  {realFundingRates.length > 0 && (
                    <Badge variant="outline" className="ml-2">
                      {realFundingRates.length} live
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingRealData ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Exchange</TableHead>
                          <TableHead>Symbol</TableHead>
                          <TableHead className="text-right">Funding Rate</TableHead>
                          <TableHead className="text-right">Spread (bps)</TableHead>
                          <TableHead className="text-right">Cost (bps)</TableHead>
                          <TableHead>Risk</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayFundingRates.slice(0, 20).map((rate: any, idx: number) => (
                          <TableRow key={`${rate.exchange}-${rate.symbol}-${idx}`}>
                            <TableCell className="font-medium">{rate.exchange || 'Unknown'}</TableCell>
                            <TableCell>{rate.symbol || 'Unknown'}</TableCell>
                            <TableCell className={`text-right font-mono ${Number.isFinite(rate.fundingRate) && rate.fundingRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {Number.isFinite(rate.fundingRate) ? `${rate.fundingRate >= 0 ? '+' : ''}${(rate.fundingRate * 100).toFixed(4)}%` : '0.0000%'}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {Number.isFinite(rate.spreadBps) ? rate.spreadBps.toFixed(1) : '0.0'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                              {Number.isFinite(rate.totalCostBps) ? rate.totalCostBps.toFixed(1) : '0.0'}
                            </TableCell>
                            <TableCell>
                              <RiskBadge tier={rate.riskTier || 'medium'} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Funding Arbitrage Tab */}
          <TabsContent value="funding-arb" className="mt-6">
            <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowLeftRight className="h-5 w-5 text-primary" />
                    Funding Arbitrage Opportunities
                    {realSignals.length > 0 && (
                      <Badge variant="outline" className="ml-2">
                        {realSignals.length} signals
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingRealData ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Symbol</TableHead>
                            <TableHead>Long Exchange</TableHead>
                            <TableHead>Short Exchange</TableHead>
                            <TableHead className="text-right">Net Profit</TableHead>
                            <TableHead className="text-right">Score</TableHead>
                            <TableHead>Risk</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {displaySignals.map((arb: any) => (
                            <TableRow key={arb.id}>
                              <TableCell className="font-medium">{arb.symbol || 'N/A'}</TableCell>
                              <TableCell className="text-green-600">{arb.longExchange || 'N/A'}</TableCell>
                              <TableCell className="text-red-600">{arb.shortExchange || 'N/A'}</TableCell>
                              <TableCell className="text-right font-mono text-green-600">
                                {Number.isFinite(arb.netProfit ?? arb.spread) ? `+${(((arb.netProfit ?? arb.spread) || 0) * 100).toFixed(4)}%` : 'N/A'}
                              </TableCell>
                              <TableCell className="text-right font-bold">{Number.isFinite(arb.score) ? arb.score : 'N/A'}</TableCell>
                              <TableCell>
                                <RiskBadge tier={arb.riskTier || 'medium'} />
                              </TableCell>
                              <TableCell>
                                <Link to={`/opportunity/${arb.id}`}>
                                  <Button size="sm" variant="outline">
                                    Open
                                  </Button>
                                </Link>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Price Arbitrage Tab */}
          <TabsContent value="price-arb" className="mt-6">
            <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5 text-primary" />
                    Price Arbitrage Opportunities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingRealData ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Symbol</TableHead>
                            <TableHead>Buy Exchange</TableHead>
                            <TableHead>Sell Exchange</TableHead>
                            <TableHead className="text-right">Spread</TableHead>
                            <TableHead className="text-right">Score</TableHead>
                            <TableHead>Risk</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mockPriceArbs.map((arb: any) => (
                            <TableRow key={arb.id}>
                              <TableCell className="font-medium">{arb.symbol || 'N/A'}</TableCell>
                              <TableCell className="text-green-600">{arb.buyExchange || 'N/A'}</TableCell>
                              <TableCell className="text-red-600">{arb.sellExchange || 'N/A'}</TableCell>
                              <TableCell className="text-right font-mono text-green-600">
                                {Number.isFinite(arb.spread) ? `+${(arb.spread * 100).toFixed(4)}%` : 'N/A'}
                              </TableCell>
                              <TableCell className="text-right font-bold">{Number.isFinite(arb.score) ? arb.score : 'N/A'}</TableCell>
                              <TableCell>
                                <RiskBadge tier={arb.riskTier} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top Opportunities Tab */}
          <TabsContent value="opportunities" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Top Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingRealData ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Symbol</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Est. Profit</TableHead>
                          <TableHead className="text-right">Score</TableHead>
                          <TableHead>Risk</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                          {mockOpportunities.map((opp: any) => (
                            <TableRow key={opp.id}>
                              <TableCell className="font-medium">{opp.symbol || 'N/A'}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{opp.type || 'N/A'}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono text-green-600">
                                {Number.isFinite(opp.estimatedProfit) ? `+${(opp.estimatedProfit * 100).toFixed(4)}%` : 'N/A'}
                              </TableCell>
                              <TableCell className="text-right font-bold">{Number.isFinite(opp.score) ? opp.score : 'N/A'}</TableCell>
                              <TableCell>
                                <RiskBadge tier={opp.riskTier || 'medium'} />
                              </TableCell>
                            <TableCell>
                              <Link to={`/opportunity/${opp.id}`}>
                                <Button size="sm" variant="outline">
                                  Open
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// Locked feature component for Pro features
function LockedFeature({ feature }: { feature: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">{feature} is a Pro Feature</h3>
        <p className="text-muted-foreground mb-4">
          Upgrade to Pro to access advanced arbitrage opportunities and signals.
        </p>
        <Link to="/billing">
          <Button>Upgrade to Pro</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
