import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsOfService() {
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
              <FileText className="h-6 w-6 text-primary" />
              Terms of Service
            </CardTitle>
            <p className="text-muted-foreground">Last updated: February 2, 2026</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <h2>1. Agreement to Terms</h2>
            <p>
              By accessing or using the Diadonum platform ("Service"), you agree to be bound by these 
              Terms of Service ("Terms"). If you disagree with any part of these terms, you may not 
              access the Service.
            </p>

            <h2>2. Description of Service</h2>
            <p>
              Diadonum is an <strong>informational platform</strong> that displays cryptocurrency 
              funding rate data, price differentials, and arbitrage opportunity indicators across 
              multiple exchanges. The Service includes:
            </p>
            <ul>
              <li>Real-time and historical funding rate data</li>
              <li>Price arbitrage opportunity indicators</li>
              <li>Paper trading simulation tools</li>
              <li>Educational content about cryptocurrency markets</li>
            </ul>

            <h2>3. NOT FINANCIAL ADVICE</h2>
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 my-4">
              <p className="text-destructive font-semibold mb-2">IMPORTANT DISCLAIMER</p>
              <p>
                The information provided by Diadonum is for <strong>educational and informational 
                purposes only</strong>. It does NOT constitute:
              </p>
              <ul className="text-foreground">
                <li>Financial advice</li>
                <li>Investment advice</li>
                <li>Trading advice</li>
                <li>A recommendation to buy, sell, or hold any cryptocurrency</li>
              </ul>
              <p className="mt-2">
                Diadonum is NOT a registered investment adviser, broker-dealer, or financial planner. 
                You should consult with a qualified financial professional before making any 
                investment decisions.
              </p>
            </div>

            <h2>4. User Responsibility</h2>
            <p>
              By using this Service, you acknowledge and agree that:
            </p>
            <ul>
              <li>You are solely responsible for your trading decisions</li>
              <li>You understand the high risks associated with cryptocurrency trading</li>
              <li>Past performance indicators do not guarantee future results</li>
              <li>Any losses incurred from trading are entirely your responsibility</li>
              <li>You will conduct your own research before making any trades</li>
            </ul>

            <h2>5. Paper Trading Disclaimer</h2>
            <p>
              The paper trading feature is a simulation tool for educational purposes. Results from 
              paper trading:
            </p>
            <ul>
              <li>Do NOT represent real trading results</li>
              <li>Do NOT account for slippage, liquidity issues, or real market conditions</li>
              <li>Should NOT be used to predict real trading performance</li>
              <li>Are NOT a guarantee of profitability in live trading</li>
            </ul>

            <h2>6. Data Accuracy</h2>
            <p>
              While we strive to provide accurate and timely data, we make NO guarantees regarding:
            </p>
            <ul>
              <li>The accuracy of funding rates or price data</li>
              <li>The timeliness of data updates</li>
              <li>The reliability of exchange API connections</li>
              <li>The validity of calculated arbitrage opportunities</li>
            </ul>
            <p>
              Data may be delayed, inaccurate, or incomplete. You should verify all information 
              independently before making trading decisions.
            </p>

            <h2>7. Age Requirement</h2>
            <p>
              You must be at least 18 years old (or the legal age in your jurisdiction) to use this 
              Service. By using the Service, you represent that you meet this requirement.
            </p>

            <h2>8. Geographic Restrictions</h2>
            <p>
              The Service may not be available or appropriate for use in all jurisdictions. You are 
              responsible for ensuring that your use of the Service complies with all applicable 
              local laws and regulations regarding cryptocurrency trading.
            </p>

            <h2>9. Account Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account at any time, with or without 
              cause, and with or without notice. Reasons for termination may include:
            </p>
            <ul>
              <li>Violation of these Terms</li>
              <li>Fraudulent or illegal activity</li>
              <li>Abuse of the Service</li>
              <li>Failure to pay subscription fees</li>
            </ul>

            <h2>10. Limitation of Liability</h2>
            <div className="bg-muted rounded-lg p-4 my-4">
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, DIADONUM AND ITS OPERATORS SHALL NOT BE 
                LIABLE FOR:
              </p>
              <ul>
                <li>Any direct, indirect, incidental, special, or consequential damages</li>
                <li>Loss of profits, data, or business opportunities</li>
                <li>Trading losses of any kind</li>
                <li>Damages arising from reliance on information provided by the Service</li>
              </ul>
              <p className="mt-2 font-semibold">
                OUR MAXIMUM LIABILITY SHALL BE LIMITED TO THE AMOUNT YOU PAID FOR THE SERVICE 
                IN THE 12 MONTHS PRECEDING THE CLAIM.
              </p>
            </div>

            <h2>11. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless Diadonum, its operators, employees, and 
              affiliates from any claims, damages, or expenses arising from your use of the Service 
              or violation of these Terms.
            </p>

            <h2>12. Dispute Resolution</h2>
            <p>
              Any disputes arising from these Terms or your use of the Service shall be resolved 
              through binding arbitration in accordance with the rules of the relevant arbitration 
              body in the United Kingdom. You waive your right to participate in class action 
              lawsuits.
            </p>

            <h2>13. Modifications to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. Continued use of the Service 
              after modifications constitutes acceptance of the updated Terms.
            </p>

            <h2>14. Contact Information</h2>
            <p>
              For questions about these Terms, please contact us at: legal@diadonum.com
            </p>

            <div className="mt-8 pt-8 border-t border-border">
              <p className="text-sm text-muted-foreground">
                By using Diadonum, you acknowledge that you have read, understood, and agree to 
                be bound by these Terms of Service.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
