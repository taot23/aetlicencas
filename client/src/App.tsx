import { Switch, Route } from "wouter";
import { queryClient, getQueryFn } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import VehiclesPage from "@/pages/vehicles-page";
import RequestLicensePage from "@/pages/request-license-page";
import TrackLicensePage from "@/pages/track-license-page";
import IssuedLicensesPage from "@/pages/issued-licenses-page";
import MyCompaniesPage from "@/pages/my-companies-page";
import AdminDashboardPage from "@/pages/admin/admin-dashboard";
import AdminLicensesPage from "@/pages/admin/admin-licenses";
import AdminTransportersPage from "@/pages/admin/admin-transporters";
import AdminUsersPage from "@/pages/admin/admin-users";
import { ProtectedRoute, AdminRoute, OperationalRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import { useEffect, useState } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      
      {/* Portal Admin - Rotas separadas */}
      <AdminRoute path="/admin" component={AdminDashboardPage} />
      <AdminRoute path="/admin/licenses" component={AdminLicensesPage} />
      <AdminRoute path="/admin/transporters" component={AdminTransportersPage} />
      <AdminRoute path="/admin/users" component={AdminUsersPage} />
      
      {/* Rotas para usuários Operacionais */}
      <OperationalRoute path="/gerenciar-licencas" component={AdminLicensesPage} />
      
      {/* Sistema de Controle de Licenças - Rotas do usuário */}
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/my-companies" component={MyCompaniesPage} />
      <ProtectedRoute path="/vehicles" component={VehiclesPage} />
      <ProtectedRoute path="/request-license" component={RequestLicensePage} />
      <ProtectedRoute path="/track-license" component={TrackLicensePage} />
      <ProtectedRoute path="/issued-licenses" component={IssuedLicensesPage} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

// Componente para pré-carregar dados importantes
function AppInitializer() {
  // Efeito para carregar dados do usuário e outros recursos importantes
  useEffect(() => {
    // Pré-carregar dados da sessão atual
    queryClient.prefetchQuery({
      queryKey: ["/api/user"],
      queryFn: getQueryFn({ on401: "returnNull" }),
    });
  }, []);
  
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppInitializer />
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
