import { cn } from "@/lib/utils";
import { LicenseStatus } from "@shared/schema";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusStyles = () => {
    switch (status) {
      case "pending_registration":
        return "bg-gray-100 text-gray-800";
      case "registration_in_progress":
        return "bg-blue-100 text-blue-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "under_review":
        return "bg-yellow-100 text-yellow-800";
      case "pending_approval":
        return "bg-purple-100 text-purple-800";
      case "approved":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case "pending_registration":
        return "Pendente Cadastro";
      case "registration_in_progress":
        return "Cadastro em Andamento";
      case "rejected":
        return "Reprovado";
      case "under_review":
        return "Análise do Órgão";
      case "pending_approval":
        return "Pendente Liberação";
      case "approved":
        return "Liberada";
      default:
        return status;
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        getStatusStyles(),
        className
      )}
    >
      {getStatusLabel()}
    </span>
  );
}

export function Status({ status }: { status: string }) {
  return (
    <div className="flex items-center">
      <StatusBadge status={status} />
    </div>
  );
}
