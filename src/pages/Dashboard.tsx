import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RiskBadge } from "@/components/RiskBadge";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
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
  Star
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Dashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Mock data state
  const [fundingRates, setFundingRates] = useState(generateFundingRates());
  const [fundingArbs, setFundingArbs] = useState(generateFundingArbitrage());
  const [priceArbs, setPriceArbs] = useState(generatePriceArbitrage());
  const [opportunities, setOpportunities] = useState(generateOpportunities());

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setFundingRates(generateFundingRates());
      setFundingArbs(generateFundingArbitrage());
      setPriceArbs(generatePriceArbitrage());
      setOpportunities(generateOpportunities());
      setLastUpdate(new Date());
      setIsRefreshing(false);
    }, 1000);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Auto refresh every 60 seconds for elite/team plans
  useEffect(() => {
    if (user?.plan === 'elite' || user?.plan === 'team') {
      const interval = setInterval(handleRefresh, 60000);
      return () => clearInterval(interval);
    }
  }, [user?.plan]);

  const isPro = user?.plan !== 'free';
  const isPlan = (plans: string[]) => plans.includes(user?.plan || 'free');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center">
              <Radar className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-bold hidden sm:inline">IQ200 RADAR</span>
          </div>
          
          <div className="flex items-center gap-2">
            <LastUpdated 
              timestamp={lastUpdate} 
              isRefreshing={isRefreshing}
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
        <DisclaimerBanner />
        
        <Tabs defaultValue="funding" className="mt-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="funding" className="gap-2">
              <TrendingUp className="h-4 w-4 hidden sm:inline" />
              Funding
            </TabsTrigger>
            <TabsTrigger value="funding-arb" className="gap-2" disabled={!isPro}>
              <ArrowLeftRight className="h-4 w-4 hidden sm:inline" />
              Funding Arb
            </TabsTrigger>
            <TabsTrigger value="price-arb" className="gap-2" disabled={!isPro}>
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
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Exchange</TableHead>
                        <TableHead>Symbol</TableHead>
                        <TableHead className="text-right">Funding Rate</TableHead>
                        <TableHead>Next Funding</TableHead>
                        <TableHead>Risk</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fundingRates.slice(0, 20).map((rate, idx) => (
                        <TableRow key={`${rate.exchange}-${rate.symbol}-${idx}`}>
                          <TableCell className="font-medium">{rate.exchange}</TableCell>
                          <TableCell>{rate.symbol}</TableCell>
                          <TableCell className={`text-right font-mono ${rate.fundingRate >= 0 ? 'text-success' : 'text-danger'}`}>
                            {rate.fundingRate >= 0 ? '+' : ''}{(rate.fundingRate * 100).toFixed(4)}%
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(rate.nextFundingTime).toLocaleTimeString()}
                          </TableCell>
                          <TableCell>
                            <RiskBadge tier={rate.riskTier} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Funding Arbitrage Tab */}
          <TabsContent value="funding-arb" className="mt-6">
            {!isPro ? (
              <LockedFeature feature="Funding Arbitrage" />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowLeftRight className="h-5 w-5 text-primary" />
                    Funding Arbitrage Opportunities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Symbol</TableHead>
                          <TableHead>Long Exchange</TableHead>
                          <TableHead>Short Exchange</TableHead>
                          <TableHead className="text-right">Spread</TableHead>
                          <TableHead className="text-right">Score</TableHead>
                          <TableHead>Risk</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fundingArbs.map((arb) => (
                          <TableRow key={arb.id}>
                            <TableCell className="font-medium">{arb.symbol}</TableCell>
                            <TableCell className="text-success">{arb.longExchange}</TableCell>
                            <TableCell className="text-danger">{arb.shortExchange}</TableCell>
                            <TableCell className="text-right font-mono text-success">
                              +{(arb.spread * 100).toFixed(4)}%
                            </TableCell>
                            <TableCell className="text-right font-bold">{arb.score}</TableCell>
                            <TableCell>
                              <RiskBadge tier={arb.riskTier} />
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
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Price Arbitrage Tab */}
          <TabsContent value="price-arb" className="mt-6">
            {!isPro ? (
              <LockedFeature feature="Price Arbitrage" />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5 text-primary" />
                    Price Arbitrage Opportunities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Symbol</TableHead>
                          <TableHead>Buy Exchange</TableHead>
                          <TableHead>Sell Exchange</TableHead>
                          <TableHead className="text-right">Spread %</TableHead>
                          <TableHead className="text-right">Net (After Fees)</TableHead>
                          <TableHead className="text-right">Score</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {priceArbs.map((arb) => (
                          <TableRow key={arb.id}>
                            <TableCell className="font-medium">{arb.symbol}</TableCell>
                            <TableCell className="text-success">{arb.buyExchange}</TableCell>
                            <TableCell className="text-danger">{arb.sellExchange}</TableCell>
                            <TableCell className="text-right font-mono">
                              {arb.spreadPercent.toFixed(3)}%
                            </TableCell>
                            <TableCell className={`text-right font-mono ${arb.netAfterFees >= 0 ? 'text-success' : 'text-danger'}`}>
                              {arb.netAfterFees >= 0 ? '+' : ''}{arb.netAfterFees.toFixed(3)}%
                            </TableCell>
                            <TableCell className="text-right font-bold">{arb.score}</TableCell>
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
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Opportunities Tab */}
          <TabsContent value="opportunities" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Top Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {opportunities.slice(0, isPro ? 12 : 3).map((opp) => (
                    <Link key={opp.id} to={`/opportunity/${opp.id}`}>
                      <Card className="trading-card h-full cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-bold">{opp.symbol}</p>
                              <p className="text-xs text-muted-foreground capitalize">{opp.type} Arb</p>
                            </div>
                            <RiskBadge tier={opp.riskTier} />
                          </div>
                          <div className="flex items-center justify-between mt-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Potential</p>
                              <p className="text-lg font-bold text-success">
                                +{opp.potentialReturn.toFixed(2)}%
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Score</p>
                              <p className="text-2xl font-bold text-primary">{opp.score}</p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-3">
                            {opp.exchanges.join(' ↔ ')}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
                {!isPro && (
                  <div className="mt-6 text-center">
                    <p className="text-muted-foreground mb-2">Upgrade to see all opportunities</p>
                    <Link to="/billing">
                      <Button>Upgrade to PRO</Button>
                    </Link>
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

function LockedFeature({ feature }: { feature: string }) {
  return (
    <Card className="text-center py-12">
      <CardContent>
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <ArrowLeftRight className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-bold mb-2">{feature} Locked</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Upgrade to PRO to unlock {feature.toLowerCase()} signals and start finding profitable opportunities.
        </p>
        <Link to="/billing">
          <Button size="lg">Upgrade to PRO - £20/month</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
