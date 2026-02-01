import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { PLAN_DETAILS } from "@/lib/mockData";
import { 
  TrendingUp, 
  ArrowLeftRight, 
  LineChart, 
  Shield, 
  Zap,
  Check,
  Star
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="/favicon.jpg" 
              alt="IQ200 RADAR" 
              className="h-10 w-10 rounded-xl object-cover"
            />
            <span className="text-xl font-bold">IQ200 RADAR</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Badge variant="secondary" className="mb-4">
          🚀 Crypto Arbitrage Radar
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Find Crypto Arbitrage
          <span className="text-gradient block">Opportunities</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Scan multiple exchanges for funding rate and price arbitrage opportunities. 
          Practice with paper trading before risking real capital.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/register">
            <Button size="lg" className="text-lg px-8">
              Start Free Trial
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline" className="text-lg px-8">
              View Demo
            </Button>
          </Link>
        </div>
        
        <div className="mt-12">
          <DisclaimerBanner />
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">
          Powerful Features
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={<TrendingUp className="h-8 w-8" />}
            title="Funding Rate Radar"
            description="Monitor funding rates across all major exchanges in real-time. Identify opportunities before they disappear."
          />
          <FeatureCard
            icon={<ArrowLeftRight className="h-8 w-8" />}
            title="Funding Arbitrage"
            description="Discover funding rate differentials between exchanges. Long on negative rates, short on positive."
          />
          <FeatureCard
            icon={<Zap className="h-8 w-8" />}
            title="Price Arbitrage"
            description="Spot price differences across exchanges. Buy low on one, sell high on another."
          />
          <FeatureCard
            icon={<LineChart className="h-8 w-8" />}
            title="Paper Trading"
            description="Practice arbitrage strategies without risking real money. Track your virtual P&L."
          />
          <FeatureCard
            icon={<Shield className="h-8 w-8" />}
            title="Risk Scoring"
            description="Every opportunity is scored and risk-rated. Make informed decisions with clear data."
          />
          <FeatureCard
            icon={<Star className="h-8 w-8" />}
            title="Priority Ranking"
            description="Opportunities ranked by potential. The best opportunities rise to the top."
          />
        </div>
      </section>

      {/* Pricing */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-4">
          Simple Pricing
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
          Choose the plan that fits your trading style. Upgrade or downgrade anytime.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {PLAN_DETAILS.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative ${plan.isPopular ? 'border-primary shadow-lg shadow-primary/10' : ''}`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary">Most Popular</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-foreground">
                    {plan.price === 0 ? 'Free' : `£${plan.price}`}
                  </span>
                  {plan.price > 0 && <span className="text-muted-foreground">/month</span>}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {plan.limitations?.map((limitation) => (
                    <li key={limitation} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="w-4 text-center">×</span>
                      <span>{limitation}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/register" className="block mt-6">
                  <Button className="w-full" variant={plan.isPopular ? "default" : "outline"}>
                    {plan.price === 0 ? "Start Free" : "Get Started"}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img 
                src="/favicon.jpg" 
                alt="IQ200 RADAR" 
                className="h-6 w-6 rounded object-cover"
              />
              <span className="font-semibold">IQ200 RADAR</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              © 2024 IQ200 RADAR. Not financial advice. Trading involves risk.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="trading-card">
      <CardHeader>
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2">
          {icon}
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
