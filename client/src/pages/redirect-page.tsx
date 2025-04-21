import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

/**
 * Componente que redireciona usuários com base em seus papéis
 * Usuários administrativos (Admin, Supervisor, Operacional) vão para /admin/licenses
 * Usuários comuns vão para o dashboard
 */
export default function RedirectPage() {
  const [, setLocation] = useLocation();
  const { user, checkRole, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      // Se é usuário administrativo, vai para a página de gerenciar licenças
      if (checkRole('operational')) {
        setLocation("/admin/licenses");
      } else {
        // Senão, vai para o dashboard do usuário normal
        setLocation("/dashboard");
      }
    }
  }, [user, isLoading, checkRole, setLocation]);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Redirecionando...</p>
    </div>
  );
}