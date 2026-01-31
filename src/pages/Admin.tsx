import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { generateAdminUsers } from "@/lib/mockData";
import { ArrowLeft, Users, ShieldCheck, UserX, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

export default function AdminPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [users, setUsers] = useState(generateAdminUsers());

  // Redirect non-admin users
  if (!user?.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleToggleActive = (userId: string) => {
    setUsers(users.map(u => 
      u.id === userId ? { ...u, isActive: !u.isActive } : u
    ));
    toast({
      title: "User Updated",
      description: "User status has been changed.",
    });
  };

  const handleGrantFree = (userId: string) => {
    setUsers(users.map(u => 
      u.id === userId ? { ...u, plan: 'free' } : u
    ));
    toast({
      title: "Free Plan Granted",
      description: "User has been marked as one of the first 50 free users.",
    });
  };

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.isActive).length;
  const proUsers = users.filter(u => u.plan !== 'free').length;
  const freeSlots = 50 - users.filter(u => u.plan === 'free').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
          <Badge variant="destructive" className="gap-1">
            <ShieldCheck className="h-3 w-3" />
            Admin
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
        <p className="text-muted-foreground mb-8">Manage users and subscriptions</p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">{activeUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">PRO Users</p>
                  <p className="text-2xl font-bold">{proUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Gift className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Free Slots Left</p>
                  <p className="text-2xl font-bold">{freeSlots}/50</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Trades</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-sm text-muted-foreground">{u.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.plan === 'free' ? 'secondary' : u.plan === 'full' ? 'destructive' : 'default'}>
                        {u.plan.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.subscriptionStatus === 'active' ? 'outline' : 'secondary'}>
                        {u.subscriptionStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{u.totalTrades}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(u.lastLogin).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Switch 
                        checked={u.isActive} 
                        onCheckedChange={() => handleToggleActive(u.id)}
                      />
                    </TableCell>
                    <TableCell>
                      {u.plan !== 'free' && freeSlots > 0 && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleGrantFree(u.id)}
                        >
                          <Gift className="h-3 w-3 mr-1" />
                          Grant Free
                        </Button>
                      )}
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
