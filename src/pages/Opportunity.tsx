import { useParams, Link } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useTradingStore } from "@/store/tradingStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RiskBadge } from "@/components/RiskBadge";
import { generateOpportunityDetails } from "@/lib/mockData";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OpportunityPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const { openPosition } = useTradingStore();
  const { toast } = useToast();
  const [tradeSize, setTradeSize] = useState("100");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const opportunity = generateOpportunityDetails(id || 'fa-0');

  const handleOpenTrade = async () => {
    await openPosition({
      symbol: opportunity.symbol,
      longExchange: opportunity.exchanges[0],
      shortExchange: opportunity.exchanges[1],
      size: parseFloat(tradeSize),
    });
    
    toast({
      title: "Position Opened!",
      description: `Paper trade opened for ${opportunity.symbol}`,
    });
    
    setIsDialogOpen(false);
  };

  // Format chart data
  const priceChartData = opportunity.priceHistory.map(p => ({
    time: new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    price: p.price,
  }));

  const fundingChartData = opportunity.fundingHistory.reduce((acc, f) => {
    const time = new Date(f.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
    const existing = acc.find(a => a.time === time);
    if (existing) {
      existing[f.exchange] = f.rate * 100;
    } else {
      acc.push({ time, [f.exchange]: f.rate * 100 });
    }
    return acc;
  }, [] as any[]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <DollarSign className="h-4 w-4" />
                Open Paper Trade
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Open Paper Trade</DialogTitle>
                <DialogDescription>
                  This is a simulated trade. No real money is involved.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Symbol</Label>
                  <Input value={opportunity.symbol} disabled />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Long Exchange</Label>
                    <Input value={opportunity.exchanges[0]} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Short Exchange</Label>
                    <Input value={opportunity.exchanges[1]} disabled />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Trade Size (USD)</Label>
                  <Input 
                    type="number" 
                    value={tradeSize} 
                    onChange={(e) => setTradeSize(e.target.value)}
                    placeholder="100"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleOpenTrade}>
                  Open Position
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Title Section */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{opportunity.symbol}</h1>
              <RiskBadge tier={opportunity.riskTier} />
            </div>
            <p className="text-muted-foreground">{opportunity.description}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Score</p>
            <p className="text-4xl font-bold text-primary">{opportunity.score}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="text-lg font-semibold capitalize">{opportunity.type} Arb</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Potential Return</p>
              <p className="text-lg font-semibold text-success">+{opportunity.potentialReturn.toFixed(2)}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Exchanges</p>
              <p className="text-lg font-semibold">{opportunity.exchanges.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Updated</p>
              <p className="text-lg font-semibold">
                {new Date(opportunity.updatedAt).toLocaleTimeString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Price History (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={priceChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="time" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-primary" />
                Funding Rate History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={fundingChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="time" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(v) => `${v.toFixed(2)}%`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(v: number) => `${v.toFixed(4)}%`}
                  />
                  <Legend />
                  {opportunity.exchanges.map((ex, i) => (
                    <Line 
                      key={ex}
                      type="monotone" 
                      dataKey={ex} 
                      stroke={i === 0 ? "hsl(var(--success))" : "hsl(var(--danger))"}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Exchange Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Exchange Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exchange</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Funding Rate</TableHead>
                  <TableHead className="text-right">24h Volume</TableHead>
                  <TableHead className="text-right">Open Interest</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opportunity.exchangeComparison.map((ex) => (
                  <TableRow key={ex.exchange}>
                    <TableCell className="font-medium">{ex.exchange}</TableCell>
                    <TableCell className="text-right font-mono">
                      ${ex.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className={`text-right font-mono ${ex.fundingRate >= 0 ? 'text-success' : 'text-danger'}`}>
                      {ex.fundingRate >= 0 ? '+' : ''}{(ex.fundingRate * 100).toFixed(4)}%
                    </TableCell>
                    <TableCell className="text-right">
                      ${(ex.volume24h / 1000000).toFixed(2)}M
                    </TableCell>
                    <TableCell className="text-right">
                      ${(ex.openInterest / 1000000).toFixed(2)}M
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
