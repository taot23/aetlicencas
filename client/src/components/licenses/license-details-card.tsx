import React from 'react';
import { AlertCircle } from 'lucide-react';
import { LicenseRequest } from '@shared/schema';
import { getLicenseTypeLabel, getCargoTypeLabel } from "@/lib/utils";

interface LicenseDetailsCardProps {
  license: LicenseRequest;
}

export function LicenseDetailsCard({ license }: LicenseDetailsCardProps) {
  // Log para debug
  console.log("LicenseDetailsCard - valores recebidos:", {
    length: license.length,
    width: license.width,
    height: license.height,
    cargoType: license.cargoType,
    mainVehiclePlate: license.mainVehiclePlate
  });
  
  // Formatar valores para exibição
  const formatDimension = (value: number | null | undefined): string => {
    if (value === null || value === undefined) {
      return '';
    }
    
    // Verificar se o valor está em centímetros (>100) ou metros (<100)
    const isInCentimeters = value > 100;
    const valueInMeters = isInCentimeters ? value / 100 : value;
    
    // Formatar com 2 casas decimais
    return valueInMeters.toFixed(2) + " m";
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
      <div className="p-2 bg-white rounded-md shadow-sm">
        <h3 className="font-medium text-sm text-gray-500">Nº da Solicitação</h3>
        <p className="text-base">{license.requestNumber}</p>
      </div>
      
      <div className="p-2 bg-white rounded-md shadow-sm">
        <h3 className="font-medium text-sm text-gray-500">Status</h3>
        <p className="text-base">
          {license.status === "pending_registration" && "Pedido em Cadastramento"}
          {license.status === "registration_in_progress" && "Cadastro em Andamento"}
          {license.status === "rejected" && "Reprovado"}
          {license.status === "under_review" && "Análise do Órgão"}
          {license.status === "pending_approval" && "Pendente Liberação"}
          {license.status === "approved" && "Liberada"}
          {license.status === "canceled" && "Cancelado"}
        </p>
      </div>
      
      <div className="p-2 bg-white rounded-md shadow-sm">
        <h3 className="font-medium text-sm text-gray-500">Tipo de Licença</h3>
        <p className="text-base">{getLicenseTypeLabel(license.type)}</p>
      </div>
      
      <div className="p-2 bg-white rounded-md shadow-sm">
        <h3 className="font-medium text-sm text-gray-500">Data de Solicitação</h3>
        <p className="text-base">
          {license.createdAt && new Date(license.createdAt).toLocaleDateString('pt-BR')}
        </p>
      </div>
      
      <div className="p-2 bg-white rounded-md shadow-sm">
        <h3 className="font-medium text-sm text-gray-500">Comprimento</h3>
        <p className="text-base">{formatDimension(license.length)}</p>
      </div>
      
      <div className={`p-2 ${license.width === null || license.width === undefined ? "bg-red-50" : "bg-white"} rounded-md shadow-sm`}>
        <h3 className={`font-medium text-sm ${license.width === null || license.width === undefined ? "text-red-500 flex items-center gap-1" : "text-gray-500"}`}>
          {(license.width === null || license.width === undefined) && <AlertCircle className="h-3.5 w-3.5" />}
          Largura <span className={license.width === null || license.width === undefined ? "text-red-600" : ""}>(obrigatório)</span>
        </h3>
        <p className="text-base">
          {license.width !== null && license.width !== undefined ? 
            formatDimension(license.width) : 
            <span className="text-red-500">Campo obrigatório não preenchido</span>}
        </p>
      </div>
      
      <div className={`p-2 ${license.height === null || license.height === undefined ? "bg-red-50" : "bg-white"} rounded-md shadow-sm`}>
        <h3 className={`font-medium text-sm ${license.height === null || license.height === undefined ? "text-red-500 flex items-center gap-1" : "text-gray-500"}`}>
          {(license.height === null || license.height === undefined) && <AlertCircle className="h-3.5 w-3.5" />}
          Altura <span className={license.height === null || license.height === undefined ? "text-red-600" : ""}>(obrigatório)</span>
        </h3>
        <p className="text-base">
          {license.height !== null && license.height !== undefined ? 
            formatDimension(license.height) : 
            <span className="text-red-500">Campo obrigatório não preenchido</span>}
        </p>
      </div>
      
      <div className={`p-2 ${license.cargoType === null || license.cargoType === undefined || license.cargoType === "" ? "bg-red-50" : "bg-white"} rounded-md shadow-sm sm:col-span-2`}>
        <h3 className={`font-medium text-sm ${license.cargoType === null || license.cargoType === undefined || license.cargoType === "" ? "text-red-500 flex items-center gap-1" : "text-gray-500"}`}>
          {(license.cargoType === null || license.cargoType === undefined || license.cargoType === "") && <AlertCircle className="h-3.5 w-3.5" />}
          Tipo de Carga <span className={license.cargoType === null || license.cargoType === undefined || license.cargoType === "" ? "text-red-600" : ""}>(obrigatório)</span>
        </h3>
        <p className="text-base">
          {license.cargoType ? 
            getCargoTypeLabel(license.cargoType) : 
            <span className="text-red-500">Campo obrigatório não preenchido</span>}
        </p>
      </div>
      
      {/* Composição de Veículos */}
      <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200 sm:col-span-2">
        <div className="flex justify-between items-center mb-1.5">
          <h4 className="font-medium text-sm">Composição de Veículos</h4>
        </div>
        
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-1.5">
          {/* Veículo principal (cavalo/truck) */}
          <div className="rounded border border-blue-100 shadow-none overflow-hidden bg-white">
            <div className="flex justify-between items-center py-1.5 px-2">
              <div className="flex flex-col">
                <span className="font-medium text-xs text-gray-800">{license.mainVehiclePlate}</span>
                <span className="text-[10px] text-gray-500">Unidade Principal</span>
              </div>
              <div className="px-1.5 py-0.5 text-[10px] bg-blue-50 text-blue-800 border border-blue-100 rounded-sm">
                Principal
              </div>
            </div>
          </div>
          
          {/* Exibir outros veículos se existirem */}
          {license.firstTrailerId && (
            <div className="rounded border border-gray-100 shadow-none overflow-hidden bg-white">
              <div className="flex justify-between items-center py-1.5 px-2">
                <div className="flex flex-col">
                  <span className="font-medium text-xs text-gray-800">1ª Carreta</span>
                  <span className="text-[10px] text-gray-500">ID: {license.firstTrailerId}</span>
                </div>
                <div className="px-1.5 py-0.5 text-[10px] bg-gray-50 text-gray-600 border border-gray-100 rounded-sm">
                  Semi-reboque
                </div>
              </div>
            </div>
          )}
          
          {license.dollyId && (
            <div className="rounded border border-gray-100 shadow-none overflow-hidden bg-white">
              <div className="flex justify-between items-center py-1.5 px-2">
                <div className="flex flex-col">
                  <span className="font-medium text-xs text-gray-800">Dolly</span>
                  <span className="text-[10px] text-gray-500">ID: {license.dollyId}</span>
                </div>
                <div className="px-1.5 py-0.5 text-[10px] bg-gray-50 text-gray-600 border border-gray-100 rounded-sm">
                  Dolly
                </div>
              </div>
            </div>
          )}
          
          {license.secondTrailerId && (
            <div className="rounded border border-gray-100 shadow-none overflow-hidden bg-white">
              <div className="flex justify-between items-center py-1.5 px-2">
                <div className="flex flex-col">
                  <span className="font-medium text-xs text-gray-800">2ª Carreta</span>
                  <span className="text-[10px] text-gray-500">ID: {license.secondTrailerId}</span>
                </div>
                <div className="px-1.5 py-0.5 text-[10px] bg-gray-50 text-gray-600 border border-gray-100 rounded-sm">
                  Reboque
                </div>
              </div>
            </div>
          )}
          
          {license.flatbedId && (
            <div className="rounded border border-gray-100 shadow-none overflow-hidden bg-white">
              <div className="flex justify-between items-center py-1.5 px-2">
                <div className="flex flex-col">
                  <span className="font-medium text-xs text-gray-800">Prancha</span>
                  <span className="text-[10px] text-gray-500">ID: {license.flatbedId}</span>
                </div>
                <div className="px-1.5 py-0.5 text-[10px] bg-gray-50 text-gray-600 border border-gray-100 rounded-sm">
                  Prancha
                </div>
              </div>
            </div>
          )}
          
          {/* Aviso se não houver veículos adicionais */}
          {!license.firstTrailerId && !license.dollyId && !license.secondTrailerId && !license.flatbedId && (
            <div className="col-span-full text-center py-2 text-sm text-gray-500">
              Nenhum veículo adicional
            </div>
          )}
        </div>
        
        <div className="mt-2 text-right text-xs text-gray-500">
          Total: {1 + 
            (license.firstTrailerId ? 1 : 0) + 
            (license.dollyId ? 1 : 0) + 
            (license.secondTrailerId ? 1 : 0) + 
            (license.flatbedId ? 1 : 0)} veículos
        </div>
      </div>
    </div>
  );
}