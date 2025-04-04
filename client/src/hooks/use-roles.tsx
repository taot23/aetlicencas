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

// Lista estática de roles
const defaultRoles: UserRole[] = ["user", "operational", "supervisor", "admin", "manager"];

export function useRoles() {
  const { toast } = useToast();
  
  // Retorna o nome descritivo do perfil
  const getRoleLabel = (role: string): string => {
    return roleDescriptions[role as UserRole] || role;
  };

  // Retorna a cor do badge para o perfil
  const getRoleColor = (role: string): string => {
    return roleColors[role as UserRole] || "default";
  };

  return {
    roles: defaultRoles,
    isLoading: false,
    getRoleLabel,
    getRoleColor,
  };
}