import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLAN_DETAILS } from "@/lib/mockData";
import { ArrowLeft, Check, CreditCard, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Plan } from "@/types";

export default function BillingPage() {
  const { user, updatePlan } = useAuthStore();
  const { toast } = useToast();

  const handleChangePlan = (planId: Plan) => {
    // In demo mode, just update the plan locally
    updatePlan(planId);
    toast({
      title: "Plan Updated!",
      description: `You are now on the ${planId.toUpperCase()} plan. (Demo mode)`,
    });
  };

  const currentPlan = PLAN_DETAILS.find(p => p.id === user?.plan);

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
        <p className="text-muted-foreground mb-8">Manage your subscription and billing settings</p>

        {/* Current Plan */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-2xl font-bold">{currentPlan?.name}</h3>
                  <Badge variant={user?.plan === 'free' ? 'secondary' : 'default'}>
                    {user?.plan === 'free' ? 'Free Tier' : 'Active'}
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  {currentPlan?.price === 0 
                    ? 'You are on the free plan' 
                    : `£${currentPlan?.price}/month`}
                </p>
              </div>
              {user?.plan !== 'free' && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Next billing date</p>
                  <p className="font-semibold">
                    {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Plan Selection */}
        <h2 className="text-xl font-semibold mb-4">Available Plans</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLAN_DETAILS.map((plan) => {
            const isCurrentPlan = plan.id === user?.plan;
            
            return (
              <Card 
                key={plan.id} 
                className={`relative ${plan.isPopular ? 'border-primary shadow-lg shadow-primary/10' : ''} ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary">Most Popular</Badge>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4">
                    <Badge variant="outline" className="bg-background">Current</Badge>
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
                  <ul className="space-y-2 mb-6">
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
                  
                  <Button 
                    className="w-full" 
                    variant={isCurrentPlan ? "outline" : plan.isPopular ? "default" : "outline"}
                    disabled={isCurrentPlan}
                    onClick={() => handleChangePlan(plan.id)}
                  >
                    {isCurrentPlan ? (
                      "Current Plan"
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        {plan.price > (currentPlan?.price || 0) ? 'Upgrade' : 'Switch'}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Demo Notice */}
        <Card className="mt-8 bg-muted/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              <strong>Demo Mode:</strong> In the full version, plan changes would be handled through Stripe. 
              For now, you can switch plans instantly to test all features.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
