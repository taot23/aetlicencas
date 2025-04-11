import { cn } from "@/lib/utils";
import { LicenseStatus } from "@shared/schema";
import { 
  Clock, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  FileText, 
  File, 
  X 
} from "lucide-react";

interface StatusBadgeProps {
  status: string;
  className?: string;
  showIcon?: boolean;
}

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  const getStatusStyles = () => {
    switch (status) {
      case "pending":
      case "pending_registration":
        return "bg-gray-100 text-gray-800";
      case "in_progress":
      case "registration_in_progress":
        return "bg-blue-100 text-blue-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "analyzing":
      case "under_review":
        return "bg-yellow-100 text-yellow-800";
      case "pending_release":
      case "pending_approval":
        return "bg-purple-100 text-purple-800";
      case "released":
      case "approved":
        return "bg-green-100 text-green-800";
      case "canceled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case "pending":
      case "pending_registration":
        return "Pedido em Cadastramento";
      case "in_progress":
      case "registration_in_progress":
        return "Cadastro em Andamento";
      case "rejected":
        return "Reprovado";
      case "analyzing":
      case "under_review":
        return "Análise do Órgão";
      case "pending_release":
      case "pending_approval":
        return "Pendente Liberação";
      case "released":
      case "approved":
        return "Liberada";
      case "canceled":
        return "Cancelado";
      default:
        return status;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "pending":
      case "pending_registration":
        return <Clock className="h-3 w-3 mr-1" />;
      case "in_progress":
      case "registration_in_progress":
        return <Loader2 className="h-3 w-3 mr-1 animate-spin" />;
      case "rejected":
        return <XCircle className="h-3 w-3 mr-1" />;
      case "analyzing":
      case "under_review":
        return <FileText className="h-3 w-3 mr-1" />;
      case "pending_release":
      case "pending_approval":
        return <File className="h-3 w-3 mr-1" />;
      case "released":
      case "approved":
        return <CheckCircle className="h-3 w-3 mr-1" />;
      case "canceled":
        return <X className="h-3 w-3 mr-1" />;
      default:
        return <Clock className="h-3 w-3 mr-1" />;
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
      {showIcon && getStatusIcon()}
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
