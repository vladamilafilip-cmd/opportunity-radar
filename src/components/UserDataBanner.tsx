import { useAuthStore } from "@/store/authStore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle, Loader2 } from "lucide-react";

export function UserDataBanner() {
  const { 
    isAuthenticated, 
    user, 
    isUserDataLoading, 
    userDataError, 
    refreshUserData 
  } = useAuthStore();

  // Only show if authenticated but userData has issues
  if (!isAuthenticated || user) {
    return null;
  }

  // Show loading state
  if (isUserDataLoading) {
    return (
      <Alert className="mb-4 border-primary/50 bg-primary/5">
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>Loading profile...</AlertTitle>
        <AlertDescription>
          Your account is being initialized. Please wait.
        </AlertDescription>
      </Alert>
    );
  }

  // Show error state with retry
  if (userDataError) {
    return (
      <Alert className="mb-4 border-destructive/50 bg-destructive/5">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Problem loading profile</AlertTitle>
        <AlertDescription className="flex flex-col gap-2">
          <span>
            Login successful, but profile data is not available. 
            You can continue using the application or try again.
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refreshUserData()}
            className="w-fit"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
