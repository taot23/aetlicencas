import { Badge } from "@/components/ui/badge";
import { User } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useRoles } from "@/hooks/use-roles";

interface RoleBadgeProps {
  role: string;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const { getRoleColor, getRoleLabel } = useRoles();
  const color = getRoleColor(role);
  const label = getRoleLabel(role);
  
  return (
    <Badge 
      className={cn(
        color === "purple" && "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 hover:bg-purple-100",
        color === "blue" && "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 hover:bg-blue-100",
        color === "yellow" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 hover:bg-yellow-100",
        color === "pink" && "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300 hover:bg-pink-100",
        color === "green" && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 hover:bg-green-100",
        className
      )}
    >
      {label}
    </Badge>
  );
}

// Componente de exibição do perfil de usuário completo
export function UserRoleBadge({ user }: { user: Pick<User, "role" | "isAdmin"> }) {
  // Se for administrador do sistema, mostrar badge especial
  if (user.isAdmin) {
    return (
      <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white">
        Admin do Sistema
      </Badge>
    );
  }
  
  // Caso contrário, mostrar o badge baseado no perfil
  return <RoleBadge role={user.role} />;
}