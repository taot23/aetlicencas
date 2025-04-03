import { UserRole } from "@shared/schema";

// Mapeamento de roles (perfis) para descrições em português
const roleDescriptions: Record<string, string> = {
  user: "Transportador",
  operational: "Operacional",
  supervisor: "Supervisor",
  admin: "Administrador",
  manager: "Gerente",
};

// Mapeamento de roles para cores do Badge
const roleColors: Record<string, string> = {
  user: "default",
  operational: "blue",
  supervisor: "yellow",
  admin: "purple",
  manager: "pink",
};

// Retorna o nome descritivo do perfil
export function getRoleLabel(role: string): string {
  return roleDescriptions[role] || role;
}

// Retorna a cor do badge para o perfil
export function getRoleColor(role: string): string {
  return roleColors[role] || "default";
}

// Verifica se um usuário tem um determinado perfil ou superior
export function hasRole(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = ["user", "operational", "supervisor", "manager", "admin"];
  
  const userRoleIndex = roleHierarchy.indexOf(userRole);
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
  
  // Se o perfil não for encontrado na hierarquia, retornar falso
  if (userRoleIndex === -1 || requiredRoleIndex === -1) {
    return false;
  }
  
  // Retorna true se o perfil do usuário for igual ou superior ao perfil requerido
  return userRoleIndex >= requiredRoleIndex;
}