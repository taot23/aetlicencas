import { cn } from "@/lib/utils";
import { CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useWebSocketContext } from "@/hooks/use-websocket-context";

interface ProgressFlowStep {
  label: string;
  value: string;
  number: number;
}

interface ProgressFlowProps {
  currentStatus: string;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
  licenseId?: number;
  state?: string;
}

export function ProgressFlow({ currentStatus: initialStatus, className, size = "md", licenseId, state }: ProgressFlowProps) {
  // Estado local para o status, inicializado com o valor passado como prop
  const [status, setStatus] = useState(initialStatus);
  const { lastMessage } = useWebSocketContext();
  
  // Efeito para atualizar o status quando receber mensagem WebSocket
  useEffect(() => {
    if (
      lastMessage?.type === 'STATUS_UPDATE' && 
      lastMessage.data && 
      licenseId && 
      lastMessage.data.licenseId === licenseId
    ) {
      // Se o evento é específico para um estado e corresponde ao estado que estamos mostrando
      if (state && lastMessage.data.state === state) {
        setStatus(lastMessage.data.status);
        console.log(`ProgressFlow: Status atualizado para licença ${licenseId}, estado ${state}: ${lastMessage.data.status}`);
      }
      // Se estamos mostrando o status geral da licença (sem estado específico) e o evento é para a licença geral
      else if (!state && lastMessage.data.license?.status) {
        setStatus(lastMessage.data.license.status);
        console.log(`ProgressFlow: Status geral atualizado para licença ${licenseId}: ${lastMessage.data.license.status}`);
      }
    }
  }, [lastMessage, licenseId, state]);
  
  // Etapas padrão do fluxo normal (sem os estados terminais especiais)
  const normalSteps: ProgressFlowStep[] = [
    { label: "Pedido em Cadastramento", value: "pending_registration", number: 1 },
    { label: "Cadastro em Andamento", value: "registration_in_progress", number: 2 },
    { label: "Análise do Órgão", value: "under_review", number: 3 },
    { label: "Pendente Liberação", value: "pending_approval", number: 4 },
    { label: "Liberada", value: "approved", number: 5 }
  ];
  
  // Estados excepcionais que só são mostrados quando são o status atual
  const specialSteps: ProgressFlowStep[] = [
    { label: "Reprovado", value: "rejected", number: 3 },
    { label: "Cancelado", value: "canceled", number: 0 }
  ];
  
  // Verificar se o status atual é um dos especiais
  const isSpecialStatus = specialSteps.some(step => step.value === status);
  
  // Definir quais passos mostrar com base no status atual
  let steps: ProgressFlowStep[];
  
  if (isSpecialStatus) {
    // Se for um status especial, pegamos os passos normais até onde estamos
    // e adicionamos apenas o status especial atual
    const currentSpecialStep = specialSteps.find(step => step.value === status)!;
    
    if (status === "rejected") {
      // Para "Reprovado", mostramos os dois primeiros passos + Reprovado
      steps = [
        ...normalSteps.slice(0, 2),
        currentSpecialStep
      ];
    } else if (status === "canceled") {
      // Para "Cancelado", mostramos apenas ele, seguido pelos passos normais
      steps = [
        currentSpecialStep,
        ...normalSteps
      ];
    } else {
      steps = normalSteps;
    }
  } else {
    // Fluxo normal
    steps = normalSteps;
  }

  // Encontrar o índice do status atual
  const currentIndex = steps.findIndex(step => step.value === status);
  
  // Determinar tamanhos com base no parâmetro size
  const getSize = () => {
    switch(size) {
      case "xs":
        return {
          circle: "w-5 h-5",
          icon: "h-3 w-3",
          font: "text-[9px]",
          label: "max-w-[45px] text-[8px]",
          container: "min-w-[320px]"
        };
      case "sm":
        return {
          circle: "w-5 h-5",
          icon: "h-3 w-3",
          font: "text-[10px]",
          label: "max-w-[50px] text-[9px]",
          container: "min-w-[320px]"
        };
      case "lg":
        return {
          circle: "w-8 h-8",
          icon: "h-5 w-5",
          font: "text-sm",
          label: "max-w-[90px] text-xs",
          container: "min-w-[600px]"
        };
      default: // medium
        return {
          circle: "w-6 h-6",
          icon: "h-4 w-4",
          font: "text-xs",
          label: "max-w-[70px] text-xs",
          container: "min-w-[450px]"
        };
    }
  };
  
  const sizeConfig = getSize();

  return (
    <div className={cn("relative flex items-center justify-between", sizeConfig.container, className)}>
      {/* Linha de conexão */}
      <div className="absolute left-0 right-0 h-0.5 bg-gray-200"></div>
      
      {/* Etapas */}
      {steps.map((step, index) => {
        // Determinando o estado visual do passo
        const isCompleted = currentIndex >= index;
        const isCurrent = step.value === status;
        // Para o caso especial "Reprovado", sempre mostramos em vermelho se for o status atual
        const isRejected = step.value === "rejected" && isCurrent;
        // Para o caso de "Cancelado", mostramos em cinza se for o status atual
        const isCanceled = step.value === "canceled" && isCurrent;
        
        // Aplicando as cores baseadas no estado
        let bgColor: string;
        if (isCurrent) {
          if (isRejected) {
            bgColor = "bg-red-500";
          } else if (isCanceled) {
            bgColor = "bg-[#B22222]"; // Cor vermelho escuro conforme solicitado
          } else {
            bgColor = "bg-blue-500";
          }
        } else if (isCompleted) {
          bgColor = "bg-green-500";
        } else {
          bgColor = "bg-gray-200";
        }
        
        return (
          <div key={step.value} className="relative flex flex-col items-center z-10">
            <div className={cn(
              sizeConfig.circle,
              "rounded-full flex items-center justify-center text-white",
              bgColor
            )}>
              {isCompleted && !isCurrent ? (
                <CheckCircle className={sizeConfig.icon} />
              ) : (
                <span className={sizeConfig.font}>{step.number}</span>
              )}
            </div>
            <span className={cn(
              "text-center mt-1 whitespace-normal", 
              sizeConfig.label,
              step.value === "canceled" ? "text-[#B22222] font-medium" : ""
            )}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Versão que mostra o progresso por estado com suporte a atualizações em tempo real
export function StateProgressFlow({ 
  stateStatus: initialStateStatus, 
  className, 
  size = "sm",
  licenseId,
  state
}: { 
  stateStatus: string, 
  className?: string, 
  size?: "sm" | "md" | "lg" | "xs",
  licenseId?: number,
  state?: string
}) {
  console.log(`StateProgressFlow inicializado com estado ${state}, status inicial ${initialStateStatus}, licenseId ${licenseId}`);
  
  const [stateStatus, setStateStatus] = useState(initialStateStatus);
  const { lastMessage } = useWebSocketContext();
  
  // Efeito para atualizar o status quando receber mensagem de atualização
  useEffect(() => {
    if (
      lastMessage?.type === 'STATUS_UPDATE' && 
      lastMessage.data && 
      licenseId && 
      state &&
      lastMessage.data.licenseId === licenseId &&
      lastMessage.data.state === state
    ) {
      setStateStatus(lastMessage.data.status);
      console.log(`StateProgressFlow: Status atualizado para licença ${licenseId}, estado ${state}: ${lastMessage.data.status}`);
    }
  }, [lastMessage, licenseId, state]);
  
  // Normalizar o status para garantir compatibilidade
  const normalizedStatus = (() => {
    // Se o formato já é um status válido, use-o diretamente
    if (['pending_registration', 'registration_in_progress', 'rejected', 
         'under_review', 'pending_approval', 'approved', 'canceled'].includes(stateStatus)) {
      console.log(`StateProgressFlow: status já normalizado: ${stateStatus}`);
      return stateStatus;
    }
    
    // Verificar se é um formato "ESTADO:STATUS" e extrair o status
    if (typeof stateStatus === 'string' && stateStatus.includes(':')) {
      const parts = stateStatus.split(':');
      if (parts.length >= 2) {
        console.log(`StateProgressFlow: extraindo status do formato ${stateStatus} -> ${parts[1]}`);
        return parts[1];
      }
    }
    
    // Se for estado SP, buscar em state_statuses
    if (state === 'SP' && licenseId) {
      console.log(`StateProgressFlow: tentando encontrar status para ${state} na licença ${licenseId}`);
    }
    
    // Fallback para o valor original
    return stateStatus;
  })();
  
  console.log(`StateProgressFlow: status normalizado para ${normalizedStatus}`);
  
  // No fluxo por estado, usamos o mesmo modelo horizontal do fluxo principal
  // mas com um tamanho específico menor
  return (
    <ProgressFlow 
      currentStatus={normalizedStatus} 
      className={cn("max-w-full min-w-full", className)} 
      size={size}
      licenseId={licenseId}
      state={state}
    />
  );
}