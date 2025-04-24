import React, { useEffect, useState } from 'react';
import { AlertCircle, Truck, ChevronsRight, Info, Building, MapPin, FileText } from 'lucide-react';
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Caminhão/Unidade Tratora */}
          {license.tractorUnitId && (
            <div className="bg-blue-50 p-4 rounded-md shadow-sm border-l-4 border-l-blue-500">
              <div className="flex justify-between mb-2">
                <div className="font-bold">{license.mainVehiclePlate}</div>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  {vehicles[license.tractorUnitId]?.type === 'truck' ? 'Caminhão' : 'Unidade Tratora'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-gray-600">Modelo:</div>
                  <div className="font-medium">
                    {vehicles[license.tractorUnitId]?.brand} {vehicles[license.tractorUnitId]?.model || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Ano:</div>
                  <div className="font-medium">{vehicles[license.tractorUnitId]?.year || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-gray-600">Tara:</div>
                  <div className="font-medium">{vehicles[license.tractorUnitId]?.tare || 'N/A'} kg</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Primeira Carreta */}
          {license.firstTrailerId && (
            <div className="bg-blue-50 p-4 rounded-md shadow-sm border-l-4 border-l-blue-500">
              <div className="flex justify-between mb-2">
                <div className="font-bold">CAR001</div>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  1ª Carreta
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-gray-600">Modelo:</div>
                  <div className="font-medium">
                    {vehicles[license.firstTrailerId]?.brand} {vehicles[license.firstTrailerId]?.model || 'Carreta 3 eixos'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Ano:</div>
                  <div className="font-medium">{vehicles[license.firstTrailerId]?.year || '2019'}</div>
                </div>
                <div>
                  <div className="text-gray-600">Capacidade:</div>
                  <div className="font-medium">30.000 kg</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Dolly */}
          {license.dollyId && (
            <div className="bg-blue-50 p-4 rounded-md shadow-sm border-l-4 border-l-blue-500">
              <div className="flex justify-between mb-2">
                <div className="font-bold">DOL001</div>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  Dolly
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-gray-600">Modelo:</div>
                  <div className="font-medium">
                    {vehicles[license.dollyId]?.brand} {vehicles[license.dollyId]?.model || 'Dolly 2 eixos'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Ano:</div>
                  <div className="font-medium">{vehicles[license.dollyId]?.year || '2020'}</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Segunda Carreta */}
          {license.secondTrailerId && (
            <div className="bg-blue-50 p-4 rounded-md shadow-sm border-l-4 border-l-blue-500">
              <div className="flex justify-between mb-2">
                <div className="font-bold">CAR002</div>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  2ª Carreta
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-gray-600">Modelo:</div>
                  <div className="font-medium">
                    {vehicles[license.secondTrailerId]?.brand} {vehicles[license.secondTrailerId]?.model || 'Carreta 3 eixos'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Ano:</div>
                  <div className="font-medium">{vehicles[license.secondTrailerId]?.year || '2018'}</div>
                </div>
                <div>
                  <div className="text-gray-600">Capacidade:</div>
                  <div className="font-medium">28.000 kg</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Prancha */}
          {license.flatbedId && (
            <div className="bg-blue-50 p-4 rounded-md shadow-sm border-l-4 border-l-blue-500">
              <div className="flex justify-between mb-2">
                <div className="font-bold">PRA001</div>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  Prancha
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-gray-600">Modelo:</div>
                  <div className="font-medium">
                    {vehicles[license.flatbedId]?.brand} {vehicles[license.flatbedId]?.model || 'Prancha 3 eixos'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Ano:</div>
                  <div className="font-medium">{vehicles[license.flatbedId]?.year || '2019'}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Placas Adicionais */}
      {license.additionalPlates && license.additionalPlates.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Placas Adicionais</h3>
          <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {license.additionalPlates.map((plate, index) => (
                <div key={index} className="bg-gray-50 p-2 rounded-md text-center">
                  <div className="font-medium">{plate}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}