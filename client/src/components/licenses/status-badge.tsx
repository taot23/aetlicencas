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
import { useWebSocketContext } from "@/hooks/use-websocket-context";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
  licenseId?: number;  // ID opcional da licença para atualização em tempo real
  state?: string;      // Estado opcional para atualização em tempo real
  className?: string;
  showIcon?: boolean;
}

export function StatusBadge({ status: initialStatus, licenseId, state, className, showIcon = true }: StatusBadgeProps) {
  const [status, setStatus] = useState(initialStatus);
  const [recentUpdate, setRecentUpdate] = useState(false);
  const { lastMessage } = useWebSocketContext();
  
  // Log quando o componente é renderizado para diagnóstico
  console.log(`StatusBadge renderizado para ${state || 'geral'}, status inicial: ${initialStatus}, id: ${licenseId}`);
  
  // Atualizar o status sempre que o initialStatus mudar (por exemplo, quando a licença é recarregada do banco)
  useEffect(() => {
    console.log(`StatusBadge: initialStatus alterado para ${initialStatus}`);
    setStatus(initialStatus);
  }, [initialStatus]);
  
  // Efeito para resetar o indicador de atualização recente após 3 segundos
  useEffect(() => {
    if (recentUpdate) {
      const timer = setTimeout(() => setRecentUpdate(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [recentUpdate]);
  
  // Efeito para atualizar o status quando receber mensagem de atualização
  useEffect(() => {
    if (
      lastMessage?.type === 'STATUS_UPDATE' && 
      lastMessage.data && 
      licenseId && 
      lastMessage.data.licenseId === licenseId
    ) {
      // Diagnóstico para entender a estrutura da mensagem
      console.log(`StatusBadge: Mensagem recebida para licença ${licenseId}${state ? ', estado ' + state : ''}:`, lastMessage.data);
      
      // Se estamos exibindo o status para um estado específico
      if (state) {
        // Verificar se a mensagem é diretamente para este estado
        if (lastMessage.data.state === state) {
          setStatus(lastMessage.data.status);
          setRecentUpdate(true);
          console.log(`Status atualizado (mensagem direta) para licença ${licenseId}, estado ${state}: ${lastMessage.data.status}`);
        } 
        // Verificar state_statuses (formato do banco de dados)
        else if (lastMessage.data.state_statuses && Array.isArray(lastMessage.data.state_statuses)) {
          // Procurar pelo status deste estado específico
          const stateStatusEntry = lastMessage.data.state_statuses.find(
            (entry: string) => typeof entry === 'string' && entry.startsWith(`${state}:`)
          );
          
          if (stateStatusEntry) {
            // Extrair o status do formato "ESTADO:STATUS[:DATA]"
            const [_, newStatus] = stateStatusEntry.split(':');
            if (newStatus) {
              setStatus(newStatus);
              setRecentUpdate(true);
              console.log(`Status atualizado (array state_statuses) para licença ${licenseId}, estado ${state}: ${newStatus}`);
            }
          }
        }
        // Ou se temos um array completo de stateStatuses na mensagem
        else if (lastMessage.data.stateStatuses && Array.isArray(lastMessage.data.stateStatuses)) {
          // Procurar pelo status deste estado específico
          const stateStatusEntry = lastMessage.data.stateStatuses.find(
            (entry: string) => typeof entry === 'string' && entry.startsWith(`${state}:`)
          );
          
          if (stateStatusEntry) {
            // Extrair o status do formato "ESTADO:STATUS[:DATA]"
            const [_, newStatus] = stateStatusEntry.split(':');
            if (newStatus) {
              setStatus(newStatus);
              setRecentUpdate(true);
              console.log(`Status atualizado (array stateStatuses) para licença ${licenseId}, estado ${state}: ${newStatus}`);
            }
          }
        }
        // Ou se a mensagem contém a licença completa
        // Verificar primeiro se tem state_statuses
        else if (lastMessage.data.license?.state_statuses && Array.isArray(lastMessage.data.license.state_statuses)) {
          // Procurar pelo status deste estado específico na licença
          const stateStatusEntry = lastMessage.data.license.state_statuses.find(
            (entry: string) => typeof entry === 'string' && entry.startsWith(`${state}:`)
          );
          
          if (stateStatusEntry) {
            // Extrair o status do formato "ESTADO:STATUS[:DATA]"
            const [_, newStatus] = stateStatusEntry.split(':');
            if (newStatus) {
              setStatus(newStatus);
              setRecentUpdate(true);
              console.log(`Status atualizado (licença completa state_statuses) para licença ${licenseId}, estado ${state}: ${newStatus}`);
            }
          }
        }
        // Ou se a mensagem contém a licença completa com stateStatuses
        else if (lastMessage.data.license?.stateStatuses && Array.isArray(lastMessage.data.license.stateStatuses)) {
          // Procurar pelo status deste estado específico na licença
          const stateStatusEntry = lastMessage.data.license.stateStatuses.find(
            (entry: string) => typeof entry === 'string' && entry.startsWith(`${state}:`)
          );
          
          if (stateStatusEntry) {
            // Extrair o status do formato "ESTADO:STATUS[:DATA]"
            const [_, newStatus] = stateStatusEntry.split(':');
            if (newStatus) {
              setStatus(newStatus);
              setRecentUpdate(true);
              console.log(`Status atualizado (licença completa) para licença ${licenseId}, estado ${state}: ${newStatus}`);
            }
          }
        }
      }
      // Se estamos mostrando o status geral da licença (sem estado específico)
      else if (!state && lastMessage.data.license?.status) {
        setStatus(lastMessage.data.license.status);
        setRecentUpdate(true);
        console.log(`Status geral atualizado para licença ${licenseId}: ${lastMessage.data.license.status}`);
      }
    }
  }, [lastMessage, licenseId, state]);
  
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
        return "bg-[#FFEDED] text-[#B22222]";
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
    <div className="inline-flex items-center">
      <span
        className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
          getStatusStyles(),
          recentUpdate ? "ring-2 ring-offset-1 ring-blue-400 transition-all duration-300" : "",
          className
        )}
      >
        {showIcon && getStatusIcon()}
        {getStatusLabel()}
      </span>
    </div>
  );
}

export function Status({ 
  status, 
  licenseId, 
  state 
}: { 
  status: string;
  licenseId?: number;
  state?: string;
}) {
  return (
    <div className="flex items-center">
      <StatusBadge 
        status={status} 
        licenseId={licenseId} 
        state={state} 
      />
    </div>
  );
}
