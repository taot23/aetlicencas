import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

// Componente de loading reutilizável
const LoadingRoute = ({ path }: { path: string }) => (
  <Route path={path}>
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-border" />
    </div>
  </Route>
);

// Componente para redirecionar ao login quando não autenticado
const RedirectToAuth = ({ path }: { path: string }) => (
  <Route path={path}>
    <Redirect to="/auth" />
  </Route>
);

// Componente para redirecionar à home quando não autorizado
const RedirectToHome = ({ path }: { path: string }) => (
  <Route path={path}>
    <Redirect to="/" />
  </Route>
);

// Rota para qualquer usuário autenticado
export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingRoute path={path} />;
  }

  if (!user) {
    return <RedirectToAuth path={path} />;
  }

  // Passa a chave única para o componente para ajudar na identificação
  // e evitar reconstrução desnecessária
  return <Route path={path}>
    <Component />
  </Route>;
}

// Rota para administradores do sistema
export function AdminRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      
      try {
        const res = await fetch("/api/admin/check", {
          credentials: "include",
        });
        
        if (res.ok) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          toast({
            title: "Acesso negado",
            description: "Você não tem permissão para acessar esta página",
            variant: "destructive",
          });
        }
      } catch (error) {
        setIsAdmin(false);
      } finally {
        setIsCheckingAdmin(false);
      }
    };
    
    if (user) {
      checkAdmin();
    } else {
      setIsCheckingAdmin(false);
    }
  }, [user, toast]);

  if (isLoading || isCheckingAdmin) {
    return <LoadingRoute path={path} />;
  }

  if (!user) {
    return <RedirectToAuth path={path} />;
  }

  if (!isAdmin) {
    return <RedirectToHome path={path} />;
  }

  return <Route path={path} component={Component} />;
}

// Rota apenas para usuários Operacionais e Supervisores
export function StaffRoute({
  path,
  component: Component,
  requiredRole = "any"
}: {
  path: string;
  component: () => React.JSX.Element;
  requiredRole?: "operational" | "supervisor" | "any";
}) {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      if (!user) return;

      try {
        // Determine qual endpoint usar com base no perfil requerido
        const endpoint = 
          requiredRole === "supervisor" 
            ? "/api/staff/check-supervisor"
            : "/api/staff/check-operational";
        
        const res = await fetch(endpoint, {
          credentials: "include",
        });
        
        if (res.ok) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
          toast({
            title: "Acesso restrito",
            description: "Você não tem permissão para acessar esta funcionalidade",
            variant: "destructive",
          });
        }
      } catch (error) {
        setIsAuthorized(false);
        toast({
          title: "Erro de verificação",
          description: "Não foi possível verificar suas permissões",
          variant: "destructive",
        });
      }

      setIsChecking(false);
    };
    
    if (user) {
      checkPermission();
    } else {
      setIsChecking(false);
    }
  }, [user, toast, requiredRole]);

  if (isLoading || isChecking) {
    return <LoadingRoute path={path} />;
  }

  if (!user) {
    return <RedirectToAuth path={path} />;
  }

  if (!isAuthorized) {
    return <RedirectToHome path={path} />;
  }

  return <Route path={path} component={Component} />;
}

// Rota apenas para usuários Supervisores
export function SupervisorRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  return (
    <StaffRoute 
      path={path} 
      component={Component} 
      requiredRole="supervisor" 
    />
  );
}

// Rota apenas para usuários Operacionais
export function OperationalRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  return (
    <StaffRoute 
      path={path} 
      component={Component} 
      requiredRole="operational" 
    />
  );
}
