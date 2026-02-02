import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Scale } from "lucide-react";

export default function Disclaimer() {
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
              <Scale className="h-6 w-6 text-primary" />
              General Disclaimer
            </CardTitle>
            <p className="text-muted-foreground">Last updated: February 2, 2026</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-6 my-4">
              <h2 className="mt-0">Summary</h2>
              <p className="text-lg">
                Diadonum provides cryptocurrency market data for <strong>educational and 
                informational purposes only</strong>. We are NOT financial advisors. We do NOT 
                provide investment recommendations. Any trading decisions you make are entirely 
                your own responsibility.
              </p>
            </div>

            <h2>1. Educational Purpose</h2>
            <p>
              All information, data, signals, and analysis provided by Diadonum are intended 
              solely for educational and informational purposes. The platform is designed to 
              help users understand cryptocurrency markets, funding rates, and arbitrage concepts.
            </p>

            <h2>2. Not Financial Advice</h2>
            <p>
              <strong>Nothing on this platform constitutes financial, investment, trading, or 
              any other kind of professional advice.</strong>
            </p>
            <ul>
              <li>We are NOT registered investment advisors</li>
              <li>We are NOT licensed financial planners</li>
              <li>We are NOT broker-dealers</li>
              <li>We do NOT provide personalized recommendations</li>
            </ul>

            <h2>3. User Acknowledgment</h2>
            <p>By using Diadonum, you acknowledge and agree that:</p>
            <ul>
              <li>All trading decisions are made at your own risk</li>
              <li>You are solely responsible for any profits or losses</li>
              <li>You will not hold Diadonum liable for trading outcomes</li>
              <li>You have the financial means to absorb potential losses</li>
              <li>You understand cryptocurrency trading is highly risky</li>
            </ul>

            <h2>4. No Guarantees</h2>
            <p>
              Diadonum makes NO guarantees regarding:
            </p>
            <ul>
              <li>The accuracy of any data or signals</li>
              <li>The profitability of any indicated opportunities</li>
              <li>The availability or reliability of the service</li>
              <li>The suitability of the information for your needs</li>
            </ul>

            <h2>5. Third-Party Data</h2>
            <p>
              We display data from third-party sources (cryptocurrency exchanges). We have no 
              control over the accuracy, timeliness, or reliability of this data. Exchange 
              APIs may experience delays, errors, or outages.
            </p>

            <h2>6. Hypothetical Performance</h2>
            <p>
              Any performance data, backtests, or simulated results presented are hypothetical 
              and do NOT represent actual trading results. Hypothetical results:
            </p>
            <ul>
              <li>Are prepared with the benefit of hindsight</li>
              <li>Do NOT account for real-world execution factors</li>
              <li>May not reflect the impact of fees and slippage</li>
              <li>Should NOT be relied upon for future performance</li>
            </ul>

            <h2>7. Jurisdiction</h2>
            <p>
              This platform may not be suitable for users in all jurisdictions. It is your 
              responsibility to ensure compliance with local laws regarding:
            </p>
            <ul>
              <li>Cryptocurrency trading</li>
              <li>Derivatives and leverage trading</li>
              <li>Tax reporting requirements</li>
            </ul>

            <h2>8. Related Documents</h2>
            <p>
              This disclaimer should be read together with:
            </p>
            <ul>
              <li><Link to="/terms" className="text-primary">Terms of Service</Link></li>
              <li><Link to="/privacy" className="text-primary">Privacy Policy</Link></li>
              <li><Link to="/risk-disclosure" className="text-primary">Risk Disclosure Statement</Link></li>
            </ul>

            <div className="mt-8 pt-8 border-t border-border bg-muted rounded-lg p-6">
              <h3 className="mt-0">Final Statement</h3>
              <p>
                Cryptocurrency trading is speculative and involves substantial risk of loss. 
                Only trade with money you can afford to lose. If you're unsure whether 
                cryptocurrency trading is right for you, consult a qualified financial advisor.
              </p>
              <p className="mb-0 font-semibold">
                By using Diadonum, you confirm that you have read and understood this disclaimer 
                and all related legal documents.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
