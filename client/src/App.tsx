import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import VehiclesPage from "@/pages/vehicles-page";
import RequestLicensePage from "@/pages/request-license-page";
import TrackLicensePage from "@/pages/track-license-page";
import IssuedLicensesPage from "@/pages/issued-licenses-page";
import AdminPage from "@/pages/admin-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/admin" component={AdminPage} />
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/vehicles" component={VehiclesPage} />
      <ProtectedRoute path="/request-license" component={RequestLicensePage} />
      <ProtectedRoute path="/track-license" component={TrackLicensePage} />
      <ProtectedRoute path="/issued-licenses" component={IssuedLicensesPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
