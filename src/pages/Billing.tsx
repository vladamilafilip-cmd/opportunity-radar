import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, Gift, Sparkles } from "lucide-react";

export default function BillingPage() {
  const allFeatures = [
    'Real-time data refresh',
    'Funding rate radar',
    'Funding arbitrage signals',
    'Price arbitrage signals',
    'Paper trading (educational)',
    '100+ trading pairs',
    '40+ meme coins included',
    'Discord & Telegram alerts',
    'API access',
    'Priority support',
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold mb-2">Billing & Subscription</h1>
        <p className="text-muted-foreground mb-8">Your subscription details</p>

        {/* Free Forever Card */}
        <Card className="mb-8 border-primary shadow-lg shadow-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Your Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-3xl font-bold">FREE</h3>
                  <Badge className="bg-primary">
                    <Sparkles className="h-3 w-3 mr-1" />
                    All Features Unlocked
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  Enjoy full access to all features - forever free!
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {allFeatures.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Info Notice */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              <strong>100% Free:</strong> All features are unlocked for everyone. 
              No credit card required. No hidden fees. Enjoy!
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
