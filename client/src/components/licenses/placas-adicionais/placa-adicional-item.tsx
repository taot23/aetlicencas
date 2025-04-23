import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { 
  X, Plus, Pencil, 
  Truck, FileText, 
  Check, AlertTriangle, 
  MoreVertical, Info, 
  Archive, Copy 
} from "lucide-react";
import { Vehicle } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface PlacaAdicionalItemProps {
  plate: string;
  index: number;
  vehicles: Vehicle[] | undefined;
  onRemove: (index: number) => void;
  onEdit?: (plate: string) => void;
}

// Componente para o ícone do tipo de veículo
function VehicleTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'tractor_unit':
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Truck className="h-4 w-4 text-blue-600" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Unidade Tratora (Cavalo Mecânico)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    case 'semi_trailer':
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="8" width="18" height="10" rx="2" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="7" y1="8" x2="7" y2="18" />
              </svg>
            </TooltipTrigger>
            <TooltipContent>
              <p>Semirreboque</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    case 'trailer':
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="16" height="10" rx="2" />
                <line x1="2" y1="12" x2="18" y2="12" />
                <line x1="6" y1="7" x2="6" y2="17" />
              </svg>
            </TooltipTrigger>
            <TooltipContent>
              <p>Reboque</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    case 'dolly':
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-600" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="6" cy="15" r="3" />
                <circle cx="18" cy="15" r="3" />
                <line x1="6" y1="12" x2="18" y2="12" />
              </svg>
            </TooltipTrigger>
            <TooltipContent>
              <p>Dolly</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    case 'flatbed':
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-600" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="9" width="20" height="7" />
                <line x1="6" y1="16" x2="6" y2="19" />
                <line x1="18" y1="16" x2="18" y2="19" />
              </svg>
            </TooltipTrigger>
            <TooltipContent>
              <p>Prancha</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    case 'truck':
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 17h14M5 17a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h10v12H5zM15 17h4M15 5h2a2 2 0 0 1 2 2v3m0 4v1a2 2 0 0 1-2 2h-2" />
                <circle cx="7" cy="17" r="2" />
                <circle cx="17" cy="17" r="2" />
              </svg>
            </TooltipTrigger>
            <TooltipContent>
              <p>Caminhão</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    default:
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-gray-400" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Tipo de veículo não identificado</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
  }
}

export function PlacaAdicionalItem({ plate, index, vehicles, onRemove, onEdit }: PlacaAdicionalItemProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  // Buscar informações detalhadas do veículo
  const vehicleDetails = React.useMemo(() => {
    if (!vehicles || !Array.isArray(vehicles) || vehicles.length === 0) {
      return null;
    }

    const normalizedPlate = plate.toUpperCase().trim();
    return vehicles.find(vehicle => 
      vehicle.plate.toUpperCase().trim() === normalizedPlate
    );
  }, [plate, vehicles]);

  const isRegistered = !!vehicleDetails;

  // Função para abrir o formulário de veículos em modal
  const handleEditVehicle = () => {
    if (onEdit) {
      onEdit(plate);
    }
  };

  // Copiar placa para a área de transferência
  const copyPlateToClipboard = () => {
    navigator.clipboard.writeText(plate);
  };

  return (
    <div 
      className={`rounded transition-all ${showDetails ? 'shadow-sm' : 'shadow-none'} 
        ${isRegistered 
          ? 'bg-white border border-green-100' 
          : 'bg-white border border-amber-100'
        }`}
    >
      {/* Cabeçalho do card */}
      <div className="flex flex-row justify-between items-center py-1.5 px-2.5">
        {/* Primeira linha com status, placa e tipo */}
        <div className="flex flex-row flex-wrap items-center gap-2">
          {/* Placa com ícone do tipo de veículo */}
          <div className="flex items-center">
            {isRegistered && (
              <span className="mr-1">
                <VehicleTypeIcon type={vehicleDetails?.type || ''} />
              </span>
            )}
            <span className="font-medium text-gray-800">{plate}</span>
          </div>
          
          {/* Badge de Status */}
          {isRegistered ? (
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 px-1.5 text-[10px] flex items-center gap-0.5 h-5 whitespace-nowrap">
              <Check className="h-2.5 w-2.5" />
              Cadastrado
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 px-1.5 text-[10px] flex items-center gap-0.5 h-5 whitespace-nowrap">
              <AlertTriangle className="h-2.5 w-2.5" />
              Não Cadastrado
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-0.5 justify-end">
          {/* Botões de ação contextual - mais compactos */}
          {isRegistered ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
                title={showDetails ? "Ocultar detalhes" : "Mostrar detalhes"}
              >
                <Info className="h-3 w-3" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleEditVehicle}
                className="h-6 w-6 p-0 text-gray-500 hover:text-green-600"
                title="Editar veículo"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleEditVehicle}
              className="h-6 px-1.5 py-0 text-[10px] bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
            >
              <Plus className="h-2.5 w-2.5 mr-0.5" />
              Cadastrar
            </Button>
          )}

          {/* Menu de ações adicionais */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuItem onClick={copyPlateToClipboard}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar placa
              </DropdownMenuItem>
              {isRegistered && (
                <>
                  <DropdownMenuItem onClick={() => setShowDetails(!showDetails)}>
                    <Info className="h-4 w-4 mr-2" />
                    {showDetails ? 'Ocultar detalhes' : 'Mostrar detalhes'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleEditVehicle}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar veículo
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onRemove(index)} className="text-red-600 hover:text-red-700 focus:text-red-700">
                <X className="h-4 w-4 mr-2" />
                Remover placa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Área de detalhes - expandida quando showDetails é true */}
      {showDetails && isRegistered && vehicleDetails && (
        <div className="px-2 pb-1.5 pt-0 border-t border-gray-100">
          <div className="grid grid-cols-2 xs:grid-cols-3 gap-x-2 gap-y-1 text-[10px] mt-1">
            <div className="overflow-hidden text-ellipsis">
              <span className="text-gray-500 block text-[9px]">Tipo:</span>
              <span className="font-medium truncate leading-tight">
                {vehicleDetails.type === 'tractor_unit' ? 'Unidade Tratora' :
                 vehicleDetails.type === 'semi_trailer' ? 'Semirreboque' :
                 vehicleDetails.type === 'trailer' ? 'Reboque' :
                 vehicleDetails.type === 'dolly' ? 'Dolly' :
                 vehicleDetails.type === 'flatbed' ? 'Prancha' :
                 vehicleDetails.type === 'truck' ? 'Caminhão' : 'Outro'}
              </span>
            </div>
            
            <div className="overflow-hidden text-ellipsis">
              <span className="text-gray-500 block text-[9px]">RENAVAM:</span>
              <span className="font-medium truncate leading-tight">{vehicleDetails.renavam}</span>
            </div>
            
            <div className="overflow-hidden text-ellipsis">
              <span className="text-gray-500 block text-[9px]">Marca/Modelo:</span>
              <span className="font-medium truncate leading-tight">{vehicleDetails.brand} {vehicleDetails.model}</span>
            </div>
            
            <div className="overflow-hidden text-ellipsis">
              <span className="text-gray-500 block text-[9px]">Ano:</span>
              <span className="font-medium truncate leading-tight">{vehicleDetails.year}</span>
            </div>
            
            <div className="overflow-hidden text-ellipsis">
              <span className="text-gray-500 block text-[9px]">Eixos:</span>
              <span className="font-medium truncate leading-tight">{vehicleDetails.axleCount}</span>
            </div>
            
            <div className="overflow-hidden text-ellipsis">
              <span className="text-gray-500 block text-[9px]">TARA:</span>
              <span className="font-medium truncate leading-tight">{vehicleDetails.tare} kg</span>
            </div>
          </div>
          
          {/* Seção de documentos - Versão mais compacta */}
          {vehicleDetails.crlvUrl && (
            <div className="mt-1 flex items-center gap-1">
              <FileText className="h-3 w-3 flex-shrink-0 text-blue-600" />
              <a 
                href={vehicleDetails.crlvUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[9px] text-blue-600 hover:underline truncate"
              >
                Ver CRLV
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}