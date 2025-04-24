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
        
        <div className="space-y-4">
          {/* Caminhão/Unidade Tratora */}
          {license.tractorUnitId && (
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <div className="bg-white flex items-center justify-between p-3">
                {/* Primeira coluna: Placa e tipo */}
                <div className="flex items-center space-x-2">
                  <div className="text-blue-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zm4-3V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-bold">{license.mainVehiclePlate}</div>
                    <div className="text-xs text-gray-500">
                      Tipo: {vehicles[license.tractorUnitId]?.type === 'truck' ? 'Caminhão' : 'Unidade Tratora'}
                    </div>
                  </div>
                  {/* Status Cadastrado */}
                  <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200 flex items-center ml-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Cadastrado
                  </span>
                </div>
                
                {/* Segunda coluna: RENAVAM */}
                <div className="hidden md:block">
                  <div className="text-xs text-gray-500">RENAVAM:</div>
                  <div className="text-sm">{vehicles[license.tractorUnitId]?.renavam || '123456789001'}</div>
                </div>
                
                {/* Terceira coluna: Marca/Modelo */}
                <div className="hidden md:block">
                  <div className="text-xs text-gray-500">Marca/Modelo:</div>
                  <div className="text-sm">
                    {vehicles[license.tractorUnitId]?.brand || 'SCANIA'} {vehicles[license.tractorUnitId]?.model || 'R450'}
                  </div>
                </div>
                
                {/* Quarta coluna: Ações */}
                <div className="flex space-x-2">
                  <button className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-50">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Detalhes expandidos */}
              <div className="bg-gray-50 border-t border-gray-200 p-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">Ano:</div>
                    <div className="text-sm font-medium">{vehicles[license.tractorUnitId]?.year || '2020'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Eixos:</div>
                    <div className="text-sm font-medium">{vehicles[license.tractorUnitId]?.axleCount || '3'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">TARA:</div>
                    <div className="text-sm font-medium">{vehicles[license.tractorUnitId]?.tare || '9000'} kg</div>
                  </div>
                  <div className="flex items-end">
                    <button className="text-blue-600 text-sm flex items-center hover:text-blue-800">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      Baixar CRLV
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Primeira Carreta */}
          {license.firstTrailerId && (
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <div className="bg-white flex items-center justify-between p-3">
                {/* Primeira coluna: Placa e tipo */}
                <div className="flex items-center space-x-2">
                  <div className="text-green-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-bold">ABC1D23</div>
                    <div className="text-xs text-gray-500">
                      Tipo: Semirreboque
                    </div>
                  </div>
                  {/* Status Cadastrado */}
                  <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200 flex items-center ml-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Cadastrado
                  </span>
                </div>
                
                {/* Segunda coluna: RENAVAM */}
                <div className="hidden md:block">
                  <div className="text-xs text-gray-500">RENAVAM:</div>
                  <div className="text-sm">{vehicles[license.firstTrailerId]?.renavam || '78542400001'}</div>
                </div>
                
                {/* Terceira coluna: Marca/Modelo */}
                <div className="hidden md:block">
                  <div className="text-xs text-gray-500">Marca/Modelo:</div>
                  <div className="text-sm">
                    {vehicles[license.firstTrailerId]?.brand || 'RANDON'} {vehicles[license.firstTrailerId]?.model || 'SR BA'}
                  </div>
                </div>
                
                {/* Quarta coluna: Ações */}
                <div className="flex space-x-2">
                  <button className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-50">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Detalhes expandidos */}
              <div className="bg-gray-50 border-t border-gray-200 p-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">Ano:</div>
                    <div className="text-sm font-medium">{vehicles[license.firstTrailerId]?.year || '2023'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Eixos:</div>
                    <div className="text-sm font-medium">{vehicles[license.firstTrailerId]?.axleCount || '3'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">TARA:</div>
                    <div className="text-sm font-medium">{vehicles[license.firstTrailerId]?.tare || '7500'} kg</div>
                  </div>
                  <div className="flex items-end">
                    <button className="text-blue-600 text-sm flex items-center hover:text-blue-800">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      Baixar CRLV
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Segunda Carreta */}
          {license.secondTrailerId && (
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <div className="bg-white flex items-center justify-between p-3">
                {/* Primeira coluna: Placa e tipo */}
                <div className="flex items-center space-x-2">
                  <div className="text-green-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-bold">RAU8G84</div>
                    <div className="text-xs text-gray-500">
                      Tipo: Semirreboque
                    </div>
                  </div>
                  {/* Status Cadastrado */}
                  <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200 flex items-center ml-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Cadastrado
                  </span>
                </div>
                
                {/* Segunda coluna: RENAVAM */}
                <div className="hidden md:block">
                  <div className="text-xs text-gray-500">RENAVAM:</div>
                  <div className="text-sm">{vehicles[license.secondTrailerId]?.renavam || '98765432101'}</div>
                </div>
                
                {/* Terceira coluna: Marca/Modelo */}
                <div className="hidden md:block">
                  <div className="text-xs text-gray-500">Marca/Modelo:</div>
                  <div className="text-sm">
                    {vehicles[license.secondTrailerId]?.brand || 'RANDON'} {vehicles[license.secondTrailerId]?.model || 'SR BA'}
                  </div>
                </div>
                
                {/* Quarta coluna: Ações */}
                <div className="flex space-x-2">
                  <button className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-50">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Detalhes expandidos */}
              <div className="bg-gray-50 border-t border-gray-200 p-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">Ano:</div>
                    <div className="text-sm font-medium">{vehicles[license.secondTrailerId]?.year || '2018'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Eixos:</div>
                    <div className="text-sm font-medium">{vehicles[license.secondTrailerId]?.axleCount || '2'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">TARA:</div>
                    <div className="text-sm font-medium">{vehicles[license.secondTrailerId]?.tare || '7000'} kg</div>
                  </div>
                  <div className="flex items-end">
                    <button className="text-blue-600 text-sm flex items-center hover:text-blue-800">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      Baixar CRLV
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Dolly (Se necessário) */}
          {license.dollyId && (
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <div className="bg-white flex items-center justify-between p-3">
                {/* Primeira coluna: Placa e tipo */}
                <div className="flex items-center space-x-2">
                  <div className="text-orange-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-bold">DOL001</div>
                    <div className="text-xs text-gray-500">
                      Tipo: Dolly
                    </div>
                  </div>
                  {/* Status Cadastrado */}
                  <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200 flex items-center ml-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Cadastrado
                  </span>
                </div>
                
                {/* Colunas opcionais para o Dolly */}
                <div className="hidden md:block">
                  <div className="text-xs text-gray-500">RENAVAM:</div>
                  <div className="text-sm">{vehicles[license.dollyId]?.renavam || '12345678901'}</div>
                </div>
                
                <div className="hidden md:block">
                  <div className="text-xs text-gray-500">Marca/Modelo:</div>
                  <div className="text-sm">Dolly 2 eixos</div>
                </div>
                
                {/* Ações */}
                <div className="flex space-x-2">
                  <button className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-50">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Detalhes do Dolly */}
              <div className="bg-gray-50 border-t border-gray-200 p-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">Ano:</div>
                    <div className="text-sm font-medium">{vehicles[license.dollyId]?.year || '2020'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Eixos:</div>
                    <div className="text-sm font-medium">{vehicles[license.dollyId]?.axleCount || '2'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">TARA:</div>
                    <div className="text-sm font-medium">{vehicles[license.dollyId]?.tare || '1500'} kg</div>
                  </div>
                  <div className="flex items-end">
                    <button className="text-blue-600 text-sm flex items-center hover:text-blue-800">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      Baixar CRLV
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Prancha (se necessário) */}
          {license.flatbedId && (
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <div className="bg-white flex items-center justify-between p-3">
                {/* Primeira coluna: Placa e tipo */}
                <div className="flex items-center space-x-2">
                  <div className="text-purple-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-bold">PRA001</div>
                    <div className="text-xs text-gray-500">
                      Tipo: Prancha
                    </div>
                  </div>
                  {/* Status Cadastrado */}
                  <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200 flex items-center ml-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Cadastrado
                  </span>
                </div>
                
                {/* Segunda coluna: RENAVAM */}
                <div className="hidden md:block">
                  <div className="text-xs text-gray-500">RENAVAM:</div>
                  <div className="text-sm">{vehicles[license.flatbedId]?.renavam || '98765432102'}</div>
                </div>
                
                {/* Terceira coluna: Marca/Modelo */}
                <div className="hidden md:block">
                  <div className="text-xs text-gray-500">Marca/Modelo:</div>
                  <div className="text-sm">
                    {vehicles[license.flatbedId]?.brand || 'FACCHINI'} {vehicles[license.flatbedId]?.model || 'Prancha 3E'}
                  </div>
                </div>
                
                {/* Quarta coluna: Ações */}
                <div className="flex space-x-2">
                  <button className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-50">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Detalhes expandidos da Prancha */}
              <div className="bg-gray-50 border-t border-gray-200 p-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">Ano:</div>
                    <div className="text-sm font-medium">{vehicles[license.flatbedId]?.year || '2019'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Eixos:</div>
                    <div className="text-sm font-medium">{vehicles[license.flatbedId]?.axleCount || '3'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">TARA:</div>
                    <div className="text-sm font-medium">{vehicles[license.flatbedId]?.tare || '8000'} kg</div>
                  </div>
                  <div className="flex items-end">
                    <button className="text-blue-600 text-sm flex items-center hover:text-blue-800">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      Baixar CRLV
                    </button>
                  </div>
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