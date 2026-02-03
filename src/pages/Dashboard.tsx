import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useTradingStore } from "@/store/tradingStore";
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
import { ProductTourWrapper } from "@/components/ProductTour";
import { PnLDisplay } from "@/components/PnLDisplay";
import { PortfolioSummary } from "@/components/PortfolioSummary";
import { ActivePositionsWidget } from "@/components/ActivePositionsWidget";
import { FundingIntervalBadge } from "@/components/FundingIntervalBadge";
import { FundingCountdown } from "@/components/FundingCountdown";
import { APRDisplay } from "@/components/APRDisplay";
import { FloatingPnL } from "@/components/FloatingPnL";
import { AutopilotPanel, AutopilotPositions, AutopilotStatus, ExplainDrawer } from "@/components/autopilot";
import { useAutopilotStore } from "@/store/autopilotStore";
import type { AutopilotPosition } from "@/types/autopilot";
import {
  generateFundingRates,
  generateFundingArbitrage,
  generatePriceArbitrage,
  generateOpportunities,
} from "@/lib/mockData";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AlertCircle,
  Calculator,
  AlertTriangle,
  HelpCircle,
  Wallet,
  TrendingDown,
  Clock
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTour } from "@/hooks/useTour";

type DataSource = "live" | "mock" | "mixed";

export default function Dashboard() {
  const { user, logout } = useAuthStore();
  const { positions, stats, refreshPositions } = useTradingStore();
  const { positions: autopilotPositions, fetchPositions: fetchAutopilotPositions } = useAutopilotStore();
  const navigate = useNavigate();
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataSource, setDataSource] = useState<DataSource>("mock");
  const [isLoadingRealData, setIsLoadingRealData] = useState(true);
  const [investmentAmount, setInvestmentAmount] = useState<number>(10000);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("8h");
  const [leverage, setLeverage] = useState<number>(1);
  const [explainPosition, setExplainPosition] = useState<AutopilotPosition | null>(null);

  // Period multiplier for profit projection
  const getPeriodMultiplier = (period: string): number => {
    switch (period) {
      case "1D": return 3;    // 3 funding intervals per day
      case "7D": return 21;   // Weekly projection
      case "30D": return 90;  // Monthly projection
      default: return 1;     // 8h base
    }
  };

  // Helper function to format profit in absolute numbers
  const formatProfitAbsolute = (percent: number): string => {
    if (!Number.isFinite(percent)) return "$0.00";
    const periodMultiplier = getPeriodMultiplier(selectedPeriod);
    const profit = investmentAmount * percent * periodMultiplier * leverage;
    return profit >= 0 
      ? `+$${profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `-$${Math.abs(profit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  };
  
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
          .eq("status", "open")
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
    
    // Auto-refresh positions every 5 seconds for live PnL
    const positionsInterval = setInterval(refreshPositions, 5000);
    
    return () => {
      clearInterval(interval);
      clearInterval(positionsInterval);
    };
  }, [fetchRealData, refreshPositions]);

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

  // Risk tier priority for sorting (safe = 0, medium = 1, high = 2)
  const riskPriority = (tier: string) => tier === 'safe' ? 0 : tier === 'medium' ? 1 : 2;

  // De-duplicate signals by symbol + long_exchange + short_exchange (keep most recent)
  const deduplicatedSignals = (() => {
    const seen = new Set<string>();
    return realSignals.filter((sig: any) => {
      const key = `${sig.symbol_id}-${sig.long_exchange}-${sig.short_exchange}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  const displaySignals = deduplicatedSignals.length > 0
    ? deduplicatedSignals.map((sig: any) => ({
        id: sig.id,
        symbol: sig.symbols?.display_name || 'Unknown',
        type: sig.signal_type || 'funding_arbitrage',
        longExchange: sig.long_exchange || 'Unknown',
        shortExchange: sig.short_exchange || 'Unknown',
        score: sig.score || 0,
        confidence: sig.confidence || 0,
        netProfit: sig.net_profit_estimate_percent || 0,
        totalFee: 8, // Default fee bps (4 + 4 for long/short)
        riskTier: sig.score > 80 ? 'safe' : sig.score > 60 ? 'medium' : 'high' as const,
      }))
      .sort((a, b) => {
        // First by risk (safe first)
        const riskDiff = riskPriority(a.riskTier) - riskPriority(b.riskTier);
        if (riskDiff !== 0) return riskDiff;
        // Then by profit (highest first)
        return (b.netProfit || 0) - (a.netProfit || 0);
      })
    : mockFundingArbs
      .map((arb: any) => ({ ...arb, totalFee: 8 }))
      .sort((a: any, b: any) => {
        const riskDiff = riskPriority(a.riskTier) - riskPriority(b.riskTier);
        if (riskDiff !== 0) return riskDiff;
        return (b.spread || 0) - (a.spread || 0);
      });

  return (
    <div className="min-h-screen bg-background relative">
      {/* Product Tour */}
      <ProductTourWrapper />
      
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/favicon.jpg" 
              alt="Diadonum" 
              className="h-12 w-12 rounded-lg object-cover"
            />
            <span className="text-2xl font-bold hidden sm:inline">Diadonum</span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Floating P&L Widget - Always visible */}
            <FloatingPnL />
            
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
                  <p className="text-xs text-primary mt-1">Full Access</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild data-tour="paper-trading">
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
        
        {/* Investment Calculator */}
        <Card className="mb-6 mt-6" data-tour="profit-calculator">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calculator className="h-5 w-5 text-primary" />
              Profit Calculator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Row 1: Investment + Period */}
            <div className="flex flex-wrap items-center gap-4">
              <Label htmlFor="investment" className="text-sm font-medium">Investment Amount:</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="investment"
                  type="number"
                  value={investmentAmount}
                  onChange={(e) => setInvestmentAmount(Math.max(0, Number(e.target.value)))}
                  className="pl-7 w-40"
                  min={0}
                />
              </div>
              
              <Label htmlFor="period" className="text-sm font-medium ml-4">Period:</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="8h">8h (1 interval)</SelectItem>
                  <SelectItem value="1D">1 day (3x)</SelectItem>
                  <SelectItem value="7D">7 days (21x)</SelectItem>
                  <SelectItem value="30D">30 days (90x)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Row 2: Leverage Slider */}
            <div className="flex flex-wrap items-center gap-4">
              <Label className="text-sm font-medium min-w-[80px]">Leverage:</Label>
              <span className="text-sm text-muted-foreground w-8">1x</span>
              <Slider
                value={[leverage]}
                onValueChange={(value) => setLeverage(value[0])}
                min={1}
                max={10}
                step={1}
                className="w-48"
              />
              <span className="text-sm text-muted-foreground w-10">10x</span>
              <Badge variant={leverage > 5 ? "destructive" : "secondary"} className="ml-2">
                {leverage}x
              </Badge>
              
              {leverage > 5 && (
                <div className="flex items-center gap-1 text-amber-500 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  High leverage increases liquidation risk
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Profit Estimate: ${investmentAmount.toLocaleString()} × {getPeriodMultiplier(selectedPeriod)}x period × {leverage}x leverage
            </p>
          </CardContent>
        </Card>

        {/* Autopilot Control Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-1">
            <AutopilotPanel />
          </div>
          <div className="lg:col-span-2">
            <AutopilotPositions 
              positions={autopilotPositions} 
              onExplain={setExplainPosition}
            />
          </div>
        </div>
        
        {/* Explain Drawer */}
        <ExplainDrawer 
          open={!!explainPosition} 
          onOpenChange={(open) => !open && setExplainPosition(null)}
          position={explainPosition}
        />

        {/* Portfolio Summary - New Enhanced Component */}
        <PortfolioSummary />
        
        {/* Active Positions Control Widget */}
        <ActivePositionsWidget />
        
        <Tabs defaultValue="funding">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="funding" className="gap-2" data-tour="funding-tab">
              <TrendingUp className="h-4 w-4 hidden sm:inline" />
              Funding
            </TabsTrigger>
            <TabsTrigger value="funding-arb" className="gap-2" data-tour="funding-arb-tab">
              <ArrowLeftRight className="h-4 w-4 hidden sm:inline" />
              Funding Arb
            </TabsTrigger>
            <TabsTrigger value="price-arb" className="gap-2" data-tour="price-arb-tab">
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
                          <TableHead className="text-right">Interval</TableHead>
                          <TableHead className="text-right">Spread (bps)</TableHead>
                          <TableHead>Risk</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayFundingRates.slice(0, 20).map((rate: any, idx: number) => (
                          <TableRow key={`${rate.exchange}-${rate.symbol}-${idx}`}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {rate.exchange || 'Unknown'}
                                <FundingIntervalBadge exchange={rate.exchange || 'Binance'} size="sm" />
                              </div>
                            </TableCell>
                            <TableCell>{rate.symbol || 'Unknown'}</TableCell>
                            <TableCell className={`text-right font-mono ${Number.isFinite(rate.fundingRate) && rate.fundingRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {Number.isFinite(rate.fundingRate) ? `${rate.fundingRate >= 0 ? '+' : ''}${(rate.fundingRate * 100).toFixed(4)}%` : '0.0000%'}
                            </TableCell>
                            <TableCell className="text-right">
                              <FundingCountdown exchange={rate.exchange || 'Binance'} showExchange={false} size="sm" />
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {Number.isFinite(rate.spreadBps) ? rate.spreadBps.toFixed(1) : '0.0'}
                            </TableCell>
                            <TableCell data-tour="risk-badge">
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
                    {displaySignals.length > 0 && (
                      <Badge variant="outline" className="ml-2">
                        {displaySignals.length} signals
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
                            <TableHead>Long</TableHead>
                            <TableHead>Short</TableHead>
                            <TableHead className="text-right">Spread</TableHead>
                            <TableHead className="text-right">APR</TableHead>
                            <TableHead className="text-right">Fee</TableHead>
                            <TableHead className="text-right">Est. Profit</TableHead>
                            <TableHead className="text-center">Next Funding</TableHead>
                            <TableHead>Risk</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {displaySignals.map((arb: any) => (
                            <TableRow key={arb.id}>
                              <TableCell className="font-medium">{arb.symbol || 'N/A'}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <span className="text-success text-sm">{arb.longExchange || 'N/A'}</span>
                                  <FundingIntervalBadge exchange={arb.longExchange || 'Binance'} size="sm" />
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <span className="text-danger text-sm">{arb.shortExchange || 'N/A'}</span>
                                  <FundingIntervalBadge exchange={arb.shortExchange || 'Binance'} size="sm" />
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-mono text-success">
                                {Number.isFinite(arb.netProfit ?? arb.spread) ? `+${(((arb.netProfit ?? arb.spread) || 0) * 100).toFixed(3)}%` : '0.000%'}
                              </TableCell>
                              <TableCell className="text-right">
                                <APRDisplay 
                                  spreadPercent={(arb.netProfit ?? arb.spread ?? 0) * 100}
                                  longExchange={arb.longExchange}
                                  shortExchange={arb.shortExchange}
                                  positionSize={investmentAmount}
                                  size="sm"
                                />
                              </TableCell>
                              <TableCell className="text-right font-mono text-muted-foreground text-xs">
                                {arb.totalFee || 8}bps
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold text-success">
                                {formatProfitAbsolute((arb.netProfit ?? arb.spread) || 0)}
                              </TableCell>
                              <TableCell className="text-center">
                                <FundingCountdown 
                                  exchange={arb.longExchange || 'Binance'} 
                                  showExchange={false}
                                  size="sm"
                                />
                              </TableCell>
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
                            <TableHead className="text-right">Fee (bps)</TableHead>
                            <TableHead className="text-right">Est. Profit ($)</TableHead>
                            <TableHead className="text-right">Score</TableHead>
                            <TableHead>Risk</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...mockPriceArbs]
                            .sort((a: any, b: any) => {
                              const riskDiff = riskPriority(a.riskTier) - riskPriority(b.riskTier);
                              if (riskDiff !== 0) return riskDiff;
                              return (b.spreadPercent || b.spread || 0) - (a.spreadPercent || a.spread || 0);
                            })
                            .map((arb: any) => (
                            <TableRow key={arb.id}>
                              <TableCell className="font-medium">{arb.symbol || 'N/A'}</TableCell>
                              <TableCell className="text-green-600">{arb.buyExchange || 'N/A'}</TableCell>
                              <TableCell className="text-red-600">{arb.sellExchange || 'N/A'}</TableCell>
                              <TableCell className="text-right font-mono text-green-600">
                                {Number.isFinite(arb.spreadPercent) ? `+${arb.spreadPercent.toFixed(4)}%` : '0.0000%'}
                              </TableCell>
                              <TableCell className="text-right font-mono text-muted-foreground">
                                8
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold text-green-600">
                                {formatProfitAbsolute((arb.netAfterFees || arb.spreadPercent || 0) / 100)}
                              </TableCell>
                              <TableCell className="text-right font-bold">{Number.isFinite(arb.score) ? arb.score : 0}</TableCell>
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
                          <TableHead className="text-right">Est. Profit %</TableHead>
                          <TableHead className="text-right">Fee (bps)</TableHead>
                          <TableHead className="text-right">Est. Profit ($)</TableHead>
                          <TableHead className="text-right">Score</TableHead>
                          <TableHead>Risk</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                          {[...mockOpportunities]
                            .sort((a: any, b: any) => {
                              const riskDiff = riskPriority(a.riskTier) - riskPriority(b.riskTier);
                              if (riskDiff !== 0) return riskDiff;
                              return (b.potentialReturn || b.estimatedProfit || 0) - (a.potentialReturn || a.estimatedProfit || 0);
                            })
                            .map((opp: any) => (
                            <TableRow key={opp.id}>
                              <TableCell className="font-medium">{opp.symbol || 'N/A'}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{opp.type || 'N/A'}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono text-green-600">
                                {Number.isFinite(opp.potentialReturn) ? `+${opp.potentialReturn.toFixed(4)}%` : '0.0000%'}
                              </TableCell>
                              <TableCell className="text-right font-mono text-muted-foreground">
                                8
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold text-green-600">
                                {formatProfitAbsolute((opp.potentialReturn || 0) / 100)}
                              </TableCell>
                              <TableCell className="text-right font-bold">{Number.isFinite(opp.score) ? opp.score : 0}</TableCell>
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
