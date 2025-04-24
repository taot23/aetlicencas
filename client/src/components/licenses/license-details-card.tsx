import React, { useEffect, useState } from 'react';
import { AlertCircle, Truck, ChevronsRight, Info, Building, MapPin, FileText, Edit, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { LicenseRequest, Transporter, Vehicle } from '@shared/schema';
import { getLicenseTypeLabel, getCargoTypeLabel, getVehicleTypeLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useQuery } from '@tanstack/react-query';

interface LicenseDetailsCardProps {
  license: LicenseRequest;
}

export function LicenseDetailsCard({ license }: LicenseDetailsCardProps) {
  // Estado para controlar quais veículos têm detalhes visíveis
  const [expandedVehicles, setExpandedVehicles] = useState<Record<number, boolean>>({});
  
  // Inicializar o estado de expansão para os veículos ao carregar o componente
  useEffect(() => {
    const vehicleIds = [
      license.tractorUnitId,
      license.firstTrailerId,
      license.dollyId,
      license.secondTrailerId,
      license.flatbedId
    ].filter(id => id !== null && id !== undefined) as number[];
    
    const initialExpandState: Record<number, boolean> = {};
    vehicleIds.forEach(id => {
      initialExpandState[id] = true; // Expandido por padrão
    });
    
    setExpandedVehicles(initialExpandState);
  }, [license]);
  
  // Função para alternar a visibilidade dos detalhes de um veículo
  const toggleVehicleDetails = (vehicleId: number) => {
    setExpandedVehicles(prev => ({
      ...prev,
      [vehicleId]: !prev[vehicleId]
    }));
  };
  
  // Função para editar um veículo
  const handleEditVehicle = (vehicleId: number) => {
    alert(`Editar veículo ID: ${vehicleId}`);
    // Aqui você implementaria a lógica para abrir um modal de edição
    // ou redirecionar para uma página de edição
  };
  
  // Renderiza os botões de ação para um veículo
  const renderVehicleActions = (vehicleId: number | null | undefined) => {
    if (!vehicleId) return null;
    
    return (
      <div className="flex space-x-1">
        <button 
          onClick={() => toggleVehicleDetails(vehicleId)} 
          className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
        >
          {expandedVehicles[vehicleId] ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        <button
          onClick={() => handleEditVehicle(vehicleId)}
          className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-50"
        >
          <Edit className="h-4 w-4" />
        </button>
        <button className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100">
          <Info className="h-4 w-4" />
        </button>
      </div>
    );
  };
  
  // Garantir valores padrão para dimensões e tipo de carga
  const licenseData = {
    ...license,
    width: license.width || getDefaultWidth(license.type),
    height: license.height || getDefaultHeight(license.type),
    cargoType: license.cargoType || getDefaultCargoType(license.type)
  };
  
  // Estado para armazenar dados dos veículos
  const [vehicles, setVehicles] = useState<{[key: string]: Vehicle}>({});
  
  // Buscar dados do transportador
  const { data: transporter } = useQuery<Transporter>({
    queryKey: ['/api/public/transporters', license.transporterId],
    queryFn: async () => {
      if (!license.transporterId) return null;
      
      const res = await fetch(`/api/public/transporters/${license.transporterId}`);
      if (!res.ok) {
        throw new Error('Falha ao carregar dados do transportador');
      }
      return res.json();
    },
    enabled: !!license.transporterId
  });
  
  // Buscar veículos relacionados
  useEffect(() => {
    // Array de IDs de veículos para buscar
    const vehicleIds = [
      license.tractorUnitId,
      license.firstTrailerId,
      license.dollyId,
      license.secondTrailerId,
      license.flatbedId
    ].filter(id => id !== null && id !== undefined);
    
    // Se não houver veículos para buscar, não fazemos nada
    if (vehicleIds.length === 0) return;
    
    // Função para buscar veículos
    const fetchVehicles = async () => {
      try {
        // Buscar dados de cada veículo
        const vehicleData: {[key: string]: Vehicle} = {};
        
        for (const id of vehicleIds) {
          const res = await fetch(`/api/vehicles/${id}`);
          if (res.ok) {
            const vehicle = await res.json();
            vehicleData[id as number] = vehicle;
          }
        }
        
        setVehicles(vehicleData);
      } catch (error) {
        console.error('Erro ao buscar dados dos veículos:', error);
      }
    };
    
    fetchVehicles();
  }, [license.tractorUnitId, license.firstTrailerId, license.dollyId, license.secondTrailerId, license.flatbedId]);
  
  // Função para obter largura padrão baseada no tipo de licença
  function getDefaultWidth(type: string): number {
    return type === "flatbed" ? 320 : 260; // 3.20m para prancha, 2.60m para demais
  }
  
  // Função para obter altura padrão baseada no tipo de licença
  function getDefaultHeight(type: string): number {
    return type === "flatbed" ? 495 : 440; // 4.95m para prancha, 4.40m para demais
  }
  
  // Função para obter tipo de carga padrão baseado no tipo de licença
  function getDefaultCargoType(type: string): string {
    return type === "flatbed" ? "indivisible_cargo" : "dry_cargo";
  }
  
  // Formatar valores para exibição
  const formatDimension = (value: number | null | undefined): string => {
    if (value === null || value === undefined) {
      return '-';
    }
    
    // Verificar se o valor está em centímetros (>100) ou metros (<100)
    const isInCentimeters = value > 100;
    const valueInMeters = isInCentimeters ? value / 100 : value;
    
    // Formatar com 2 casas decimais
    return valueInMeters.toFixed(2);
  };
  
  // Função para obter o label do status
  const getStatusLabel = (status: string): string => {
    const statusLabels: Record<string, string> = {
      pending_registration: "Pedido em Cadastramento",
      registration_in_progress: "Cadastro em Andamento", 
      rejected: "Reprovado",
      under_review: "Análise do Órgão",
      pending_approval: "Pendente Liberação",
      approved: "Liberada",
      canceled: "Cancelado"
    };
    
    return statusLabels[status] || status;
  };

  // Renderizador de veículo (para reutilização)
  const renderVehicle = (vehicleId: number | null | undefined, placa: string, tipo: string) => {
    if (!vehicleId) return null;
    
    const vehicle = vehicles[vehicleId];
    const isExpanded = expandedVehicles[vehicleId];
    
    return (
      <div className="border border-gray-200 rounded-md overflow-hidden h-full">
        <div className="bg-white flex flex-wrap items-center justify-between p-2">
          {/* Cabeçalho com placa e tipo */}
          <div className="flex items-center w-full sm:w-auto">
            <div className="text-blue-600 mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zm4-3V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
              </svg>
            </div>
            <div className="font-bold">{placa}</div>
            <span className="text-xs text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200 flex items-center ml-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Cadastrado
            </span>
          </div>
          
          {/* Ações */}
          {renderVehicleActions(vehicleId)}
        </div>
        
        {/* Informações principais - visíveis apenas se expandido */}
        {isExpanded && (
          <div className="bg-white px-2 py-1 text-xs grid grid-cols-2 gap-x-2 border-t border-gray-100">
            <div>
              <div className="text-gray-500">Tipo:</div>
              <div>{vehicle?.type === 'truck' ? 'Caminhão' : tipo}</div>
            </div>
            <div>
              <div className="text-gray-500">RENAVAM:</div>
              <div>{vehicle?.renavam || '-'}</div>
            </div>
            <div className="mt-1">
              <div className="text-gray-500">Marca/Modelo:</div>
              <div>{vehicle?.brand || '-'} {vehicle?.model || '-'}</div>
            </div>
            <div className="mt-1">
              <div className="text-gray-500">Ano:</div>
              <div>{vehicle?.year || '-'}</div>
            </div>
          </div>
        )}
        
        {/* Rodapé */}
        <div className="bg-gray-50 border-t border-gray-200 p-2 flex justify-between items-center text-xs">
          <div className="flex items-center space-x-3">
            <div>
              <span className="text-gray-500">Eixos:</span> {vehicle?.axleCount || '-'}
            </div>
            <div>
              <span className="text-gray-500">TARA:</span> {vehicle?.tare || '-'} kg
            </div>
          </div>
          <button className="text-blue-600 text-xs flex items-center hover:text-blue-800">
            <Download className="h-3.5 w-3.5 mr-1" />
            CRLV
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 mt-4">
      {/* Cabeçalho do pedido */}
      <div className="bg-slate-700 text-white p-4 rounded-md shadow-sm">
        <h2 className="text-xl font-bold">Pedido #{license.requestNumber}</h2>
      </div>
      
      {/* Dados do Transportador */}
      {transporter && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Transportador</h3>
          <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-gray-600 text-sm">Nome/Razão Social:</div>
                <div className="font-medium">{transporter.name}</div>
              </div>
              <div>
                <div className="text-gray-600 text-sm">CNPJ:</div>
                <div className="font-medium">{transporter.documentNumber}</div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Dados do Conjunto */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Dados do Conjunto</h3>
        <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-gray-600 text-sm">Tipo de Conjunto:</div>
              <div className="font-medium">{getLicenseTypeLabel(license.type)}</div>
            </div>
            <div>
              <div className="text-gray-600 text-sm">Tipo de Carga:</div>
              <div className="font-medium">{getCargoTypeLabel(licenseData.cargoType)}</div>
            </div>
          </div>
          
          {/* Dimensões em cards */}
          <div className="grid grid-cols-3 gap-4 mt-2">
            <div className="bg-gray-50 p-3 rounded-md text-center">
              <div className="text-2xl font-bold">{formatDimension(licenseData.length)} m</div>
              <div className="text-gray-500 text-sm">Comprimento Total</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-md text-center">
              <div className="text-2xl font-bold">{formatDimension(licenseData.width)} m</div>
              <div className="text-gray-500 text-sm">Largura</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-md text-center">
              <div className="text-2xl font-bold">{formatDimension(licenseData.height)} m</div>
              <div className="text-gray-500 text-sm">Altura</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Linha de Frente */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Linha de Frente</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Caminhão/Unidade Tratora */}
          {license.tractorUnitId && renderVehicle(license.tractorUnitId, license.mainVehiclePlate!, 'Unidade Tratora')}
        
          {/* Primeira Carreta */}
          {license.firstTrailerId && renderVehicle(license.firstTrailerId, 
            vehicles[license.firstTrailerId]?.plate || "Placa não disponível", 
            'Semirreboque')}
          
          {/* Dolly */}
          {license.dollyId && renderVehicle(license.dollyId,
            vehicles[license.dollyId]?.plate || "Placa não disponível",
            'Dolly')}
            
          {/* Segunda Carreta */}
          {license.secondTrailerId && renderVehicle(license.secondTrailerId,
            vehicles[license.secondTrailerId]?.plate || "Placa não disponível",
            'Semirreboque')}
            
          {/* Prancha */}
          {license.flatbedId && renderVehicle(license.flatbedId,
            vehicles[license.flatbedId]?.plate || "Placa não disponível",
            'Prancha')}
        </div>
      </div>
      
      {/* Placas Adicionais */}
      {license.additionalPlates && license.additionalPlates.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Placas Adicionais</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {license.additionalPlates.map((plate, index) => (
              <div key={index} className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="bg-blue-100 text-blue-800 p-1 rounded mr-2">
                      <Truck className="h-4 w-4" />
                    </div>
                    <div className="font-medium">{plate}</div>
                  </div>
                  <button className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-50">
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Estados */}
      {license.states && license.states.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Estados do Pedido</h3>
          <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
            <div className="flex flex-wrap gap-2">
              {license.states.map(state => (
                <Badge key={state} className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                  {state}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}