import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export type UserRole = "user" | "operational" | "supervisor" | "admin" | "manager";

// Mapeamento de roles (perfis) para descrições em português
const roleDescriptions: Record<UserRole, string> = {
  user: "Transportador",
  operational: "Operacional",
  supervisor: "Supervisor",
  admin: "Administrador",
  manager: "Gerente"
};

// Mapeamento de roles para cores do Badge
export const roleColors: Record<UserRole, string> = {
  user: "default",
  operational: "blue",
  supervisor: "yellow",
  admin: "purple",
  manager: "pink"
};

export function useRoles() {
  const { toast } = useToast();
  
  const { 
    data: roles = [],
    isLoading,
    error 
  } = useQuery<string[]>({
    queryKey: ["/api/roles"],
    queryFn: async () => {
      try {
        const response = await getQueryFn()("/api/roles");
        return response.roles || [];
      } catch (error) {
        console.error("Erro ao carregar perfis:", error);
        toast({
          title: "Erro ao carregar perfis",
          description: "Não foi possível obter a lista de perfis disponíveis",
          variant: "destructive",
        });
        return [];
      }
    },
  });

  // Retorna o nome descritivo do perfil
  const getRoleLabel = (role: string): string => {
    return roleDescriptions[role as UserRole] || role;
  };

  // Retorna a cor do badge para o perfil
  const getRoleColor = (role: string): string => {
    return roleColors[role as UserRole] || "default";
  };

  return {
    roles,
    isLoading,
    error,
    getRoleLabel,
    getRoleColor,
  };
}