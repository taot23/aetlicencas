import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}

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
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  if (!isAdmin) {
    return (
      <Route path={path}>
        <Redirect to="/" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
