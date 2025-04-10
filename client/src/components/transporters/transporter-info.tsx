import { useQuery } from "@tanstack/react-query";
import { Transporter } from "@shared/schema";
import { Loader2 } from "lucide-react";

interface TransporterInfoProps {
  transporterId: number | null;
  className?: string;
  compact?: boolean;
}

/**
 * Componente otimizado para exibir informações do transportador
 * 
 * Props:
 * - transporterId: ID do transportador a ser exibido
 * - className: Classe CSS adicional para estilização
 * - compact: Se true, exibe uma versão mais compacta do componente (apenas nome do transportador)
 */
export const TransporterInfo = ({ 
  transporterId, 
  className = "", 
  compact = false 
}: TransporterInfoProps) => {
  const { data: transporter, isLoading } = useQuery<Transporter>({
    queryKey: ['/api/transporters', transporterId],
    queryFn: async () => {
      if (!transporterId) return null;
      const res = await fetch(`/api/transporters/${transporterId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!transporterId,
    staleTime: 10 * 60 * 1000, // Cache por 10 minutos
    retry: 1
  });

  if (compact) {
    return (
      <div className={`text-sm ${className}`}>
        {isLoading ? (
          <div className="flex items-center space-x-1">
            <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
            <span className="text-gray-500">Carregando...</span>
          </div>
        ) : transporter ? (
          <span className="font-medium">
            {transporter.name}
          </span>
        ) : (
          <span className="text-gray-500 italic">Transportador não encontrado</span>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <h3 className="text-sm font-medium text-gray-500">Transportador</h3>
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          <span className="text-sm text-gray-500">Carregando dados do transportador...</span>
        </div>
      ) : transporter ? (
        <p className="text-gray-900">
          {transporter.name}
          {transporter.documentNumber && ` - ${transporter.documentNumber}`}
          {transporter.personType === "pj" && transporter.tradeName && ` (${transporter.tradeName})`}
        </p>
      ) : (
        <p className="text-gray-500">Transportador não encontrado</p>
      )}
    </div>
  );
};