import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default function RiskDisclosure() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="/favicon.jpg" 
              alt="Diadonum" 
              className="h-10 w-10 rounded-xl object-cover"
            />
            <span className="text-xl font-bold">Diadonum</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              Risk Disclosure Statement
            </CardTitle>
            <p className="text-muted-foreground">Last updated: February 2, 2026</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 my-4">
              <h2 className="text-destructive mt-0">⚠️ HIGH RISK WARNING</h2>
              <p className="text-lg font-semibold">
                Cryptocurrency trading involves substantial risk of loss and is not suitable for 
                all investors. You could lose some or ALL of your invested capital.
              </p>
            </div>

            <h2>1. Market Volatility Risk</h2>
            <p>
              Cryptocurrency markets are extremely volatile. Prices can change by 10%, 20%, or even 
              50%+ within minutes or hours. This volatility means:
            </p>
            <ul>
              <li>Arbitrage opportunities may disappear before you can execute</li>
              <li>Price movements can turn profitable trades into losses</li>
              <li>Funding rates can change rapidly and unpredictably</li>
              <li>Market conditions can shift without warning</li>
            </ul>

            <h2>2. Complete Loss of Capital</h2>
            <div className="bg-muted rounded-lg p-4 my-4">
              <p className="font-semibold mb-2">You could lose your ENTIRE investment.</p>
              <p>
                Due to leverage, liquidation mechanisms, and extreme volatility, it is possible 
                to lose 100% of your trading capital in a single trade or over a short period.
              </p>
            </div>

            <h2>3. Leverage Risk</h2>
            <p>
              Using leverage amplifies both gains AND losses. For example:
            </p>
            <ul>
              <li><strong>5x leverage:</strong> A 20% price movement against you = 100% loss (liquidation)</li>
              <li><strong>10x leverage:</strong> A 10% price movement against you = 100% loss (liquidation)</li>
              <li><strong>20x leverage:</strong> A 5% price movement against you = 100% loss (liquidation)</li>
            </ul>
            <p className="text-destructive font-semibold">
              Higher leverage = Higher risk of complete loss
            </p>

            <h2>4. Past Performance Disclaimer</h2>
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 my-4">
              <p className="font-semibold">
                PAST PERFORMANCE DOES NOT GUARANTEE FUTURE RESULTS
              </p>
              <p>
                Historical funding rates, arbitrage opportunities, and trading results shown on 
                this platform are for informational purposes only. They are NOT indicative of 
                future performance.
              </p>
            </div>

            <h2>5. Signal and Data Accuracy</h2>
            <p>
              The signals and data provided by Diadonum may be:
            </p>
            <ul>
              <li><strong>Delayed:</strong> Real-time data may have latency</li>
              <li><strong>Inaccurate:</strong> Exchange APIs may report incorrect data</li>
              <li><strong>Incomplete:</strong> Not all market factors are captured</li>
              <li><strong>Wrong:</strong> Calculated opportunities may not be profitable in reality</li>
            </ul>
            <p>
              <strong>NEVER trade based solely on signals from this platform.</strong> Always 
              conduct your own research and verification.
            </p>

            <h2>6. Execution Risk</h2>
            <p>
              Even if an arbitrage opportunity exists, you may not be able to profit from it due to:
            </p>
            <ul>
              <li>Slippage: Actual execution prices differ from displayed prices</li>
              <li>Liquidity: Insufficient order book depth</li>
              <li>Fees: Trading fees may exceed the arbitrage profit</li>
              <li>Latency: Opportunity disappears before execution</li>
              <li>Exchange issues: Withdrawals disabled, API errors, maintenance</li>
            </ul>

            <h2>7. Technical Risks</h2>
            <p>
              Technical failures can result in significant losses:
            </p>
            <ul>
              <li>Exchange outages during volatile periods</li>
              <li>API connection failures</li>
              <li>Platform bugs or errors</li>
              <li>Internet connectivity issues</li>
              <li>Trading bot malfunctions</li>
            </ul>

            <h2>8. Regulatory Risk</h2>
            <p>
              The cryptocurrency industry faces significant regulatory uncertainty:
            </p>
            <ul>
              <li>New regulations could ban or restrict trading</li>
              <li>Exchanges may be shut down by authorities</li>
              <li>Tax laws may change unexpectedly</li>
              <li>Your country may impose trading restrictions</li>
            </ul>

            <h2>9. Exchange Counterparty Risk</h2>
            <p>
              Cryptocurrency exchanges can fail or become insolvent:
            </p>
            <ul>
              <li>Exchange hacks and security breaches</li>
              <li>Bankruptcy (e.g., FTX, Celsius, Voyager)</li>
              <li>Frozen withdrawals</li>
              <li>Fraudulent practices</li>
            </ul>
            <p className="font-semibold">
              Never keep more funds on an exchange than you are willing to lose.
            </p>

            <h2>10. Psychological Risk</h2>
            <p>
              Trading can have psychological effects including:
            </p>
            <ul>
              <li>Emotional decision-making</li>
              <li>Addiction to trading</li>
              <li>Stress and anxiety</li>
              <li>Depression from losses</li>
            </ul>

            <h2>11. Only Trade What You Can Afford to Lose</h2>
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 my-4">
              <p className="font-bold text-destructive">
                NEVER invest money you cannot afford to lose completely.
              </p>
              <p>
                Do not trade with:
              </p>
              <ul className="text-foreground">
                <li>Rent or mortgage money</li>
                <li>Emergency funds</li>
                <li>Borrowed money or credit</li>
                <li>Retirement savings</li>
                <li>Money needed for essential expenses</li>
              </ul>
            </div>

            <h2>12. Seek Professional Advice</h2>
            <p>
              Before trading cryptocurrencies, consult with:
            </p>
            <ul>
              <li>A licensed financial advisor</li>
              <li>A tax professional</li>
              <li>A legal professional familiar with crypto regulations</li>
            </ul>

            <div className="mt-8 pt-8 border-t border-border">
              <p className="text-sm text-muted-foreground">
                By using Diadonum, you acknowledge that you have read, understood, and accept 
                all the risks described in this Risk Disclosure Statement. You agree that 
                Diadonum and its operators are NOT liable for any losses you may incur.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
