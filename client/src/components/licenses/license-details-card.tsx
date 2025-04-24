import React from 'react';
import { AlertCircle, Truck, ChevronsRight, Info, ArrowRight } from 'lucide-react';
import { LicenseRequest } from '@shared/schema';
import { getLicenseTypeLabel, getCargoTypeLabel, getVehicleTypeLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
    return valueInMeters.toFixed(2) + " m";
  };
  
  // Função para obter a cor do status
  const getStatusColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      pending_registration: "bg-gray-100 text-gray-800",
      registration_in_progress: "bg-blue-100 text-blue-800",
      rejected: "bg-red-100 text-red-800",
      under_review: "bg-amber-100 text-amber-800",
      pending_approval: "bg-purple-100 text-purple-800",
      approved: "bg-green-100 text-green-800",
      canceled: "bg-slate-100 text-slate-800"
    };
    
    return statusColors[status] || "bg-gray-100 text-gray-800";
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
    <div className="grid gap-4 mt-4">
      {/* Cabeçalho com informações principais */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="bg-blue-500 h-1.5 w-full"></div>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Solicitação #{license.requestNumber}</CardTitle>
                <Badge className={`${getStatusColor(license.status)}`}>
                  {getStatusLabel(license.status)}
                </Badge>
              </div>
              <CardDescription>
                Solicitada em {license.createdAt && new Date(license.createdAt).toLocaleDateString('pt-BR')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Detalhes do Conjunto */}
          <div className="mb-6">
            <h3 className="font-semibold text-base mb-3 flex items-center text-blue-600">
              <Info className="h-4 w-4 mr-1.5" /> 
              Informações do Conjunto
            </h3>
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <h4 className="text-xs font-medium text-gray-500 mb-1">Tipo</h4>
                  <p className="font-medium">{getLicenseTypeLabel(license.type)}</p>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-gray-500 mb-1">Comprimento</h4>
                  <p className="font-medium text-lg">{formatDimension(licenseData.length)}</p>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-gray-500 mb-1">Largura</h4>
                  <p className="font-medium text-lg">{formatDimension(licenseData.width)}</p>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-gray-500 mb-1">Altura</h4>
                  <p className="font-medium text-lg">{formatDimension(licenseData.height)}</p>
                </div>
              </div>
              <Separator className="my-3" />
              <div>
                <h4 className="text-xs font-medium text-gray-500 mb-1">Tipo de Carga</h4>
                <p className="font-medium">{getCargoTypeLabel(licenseData.cargoType)}</p>
              </div>
            </div>
          </div>
          
          {/* Composição de Veículos - Linha de Frente */}
          <div className="mb-4">
            <h3 className="font-semibold text-base mb-3 flex items-center text-blue-600">
              <Truck className="h-4 w-4 mr-1.5" /> 
              Linha de Frente
            </h3>
            <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* Unidade Principal */}
                <div className="bg-white rounded-md shadow-sm border border-blue-200 p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-blue-800">{license.mainVehiclePlate}</h4>
                      <span className="text-xs text-gray-500">Unidade Principal</span>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Principal
                    </Badge>
                  </div>
                </div>
                
                {/* Primeira Carreta */}
                {license.firstTrailerId && (
                  <div className="bg-white rounded-md shadow-sm border border-blue-200 p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-blue-800">1ª Carreta</h4>
                        <span className="text-xs text-gray-500">ID: {license.firstTrailerId}</span>
                      </div>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Semi-reboque
                      </Badge>
                    </div>
                  </div>
                )}
                
                {/* Dolly */}
                {license.dollyId && (
                  <div className="bg-white rounded-md shadow-sm border border-blue-200 p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-blue-800">Dolly</h4>
                        <span className="text-xs text-gray-500">ID: {license.dollyId}</span>
                      </div>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Dolly
                      </Badge>
                    </div>
                  </div>
                )}
                
                {/* Segunda Carreta */}
                {license.secondTrailerId && (
                  <div className="bg-white rounded-md shadow-sm border border-blue-200 p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-blue-800">2ª Carreta</h4>
                        <span className="text-xs text-gray-500">ID: {license.secondTrailerId}</span>
                      </div>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Reboque
                      </Badge>
                    </div>
                  </div>
                )}
                
                {/* Prancha */}
                {license.flatbedId && (
                  <div className="bg-white rounded-md shadow-sm border border-blue-200 p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-blue-800">Prancha</h4>
                        <span className="text-xs text-gray-500">ID: {license.flatbedId}</span>
                      </div>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Prancha
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Placas Adicionais */}
          {license.additionalPlates && license.additionalPlates.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold text-base mb-3 flex items-center text-blue-600">
                <ChevronsRight className="h-4 w-4 mr-1.5" /> 
                Placas Adicionais ({license.additionalPlates.length})
              </h3>
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {license.additionalPlates.map((plate, index) => (
                    <div key={index} className="bg-white rounded border border-gray-200 shadow-sm p-2 text-center">
                      <span className="font-medium text-sm">{plate}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Resumo da Composição */}
          <div className="bg-blue-50 rounded-md border border-blue-100 p-3 mt-4">
            <h3 className="font-medium text-sm text-blue-800 mb-1">Resumo da Composição</h3>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-sm flex flex-wrap gap-x-4">
                <span>
                  <strong>{1 + 
                    (license.firstTrailerId ? 1 : 0) + 
                    (license.dollyId ? 1 : 0) + 
                    (license.secondTrailerId ? 1 : 0) + 
                    (license.flatbedId ? 1 : 0)}
                  </strong> veículos na linha de frente
                </span>
                <span>
                  <strong>{license.additionalPlates?.length || 0}</strong> placas adicionais
                </span>
                <span>
                  <strong>{
                    (1 + 
                    (license.firstTrailerId ? 1 : 0) + 
                    (license.dollyId ? 1 : 0) + 
                    (license.secondTrailerId ? 1 : 0) + 
                    (license.flatbedId ? 1 : 0)) +
                    (license.additionalPlates?.length || 0)
                  }</strong> veículos no total
                </span>
              </div>
              <Badge variant="outline" className="bg-white">
                {getLicenseTypeLabel(license.type)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}