import React from 'react';
import { AlertCircle } from 'lucide-react';
import { LicenseRequest } from '@shared/schema';
import { getLicenseTypeLabel, getCargoTypeLabel } from "@/lib/utils";

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

  // Log para debug
  console.log("LicenseDetailsCard - valores recebidos:", {
    length: license.length,
    width: license.width,
    height: license.height,
    cargoType: license.cargoType,
    mainVehiclePlate: license.mainVehiclePlate
  });
  
  console.log("LicenseDetailsCard - valores processados:", {
    length: licenseData.length,
    width: licenseData.width,
    height: licenseData.height,
    cargoType: licenseData.cargoType,
    type: licenseData.type
  });
  
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
        <p className="text-base">{formatDimension(licenseData.length)}</p>
      </div>
      
      <div className="p-2 bg-white rounded-md shadow-sm">
        <h3 className="font-medium text-sm text-gray-500">
          Largura
        </h3>
        <p className="text-base">
          {formatDimension(licenseData.width)}
        </p>
      </div>
      
      <div className="p-2 bg-white rounded-md shadow-sm">
        <h3 className="font-medium text-sm text-gray-500">
          Altura
        </h3>
        <p className="text-base">
          {formatDimension(licenseData.height)}
        </p>
      </div>
      
      <div className="p-2 bg-white rounded-md shadow-sm sm:col-span-2">
        <h3 className="font-medium text-sm text-gray-500">
          Tipo de Carga
        </h3>
        <p className="text-base">
          {getCargoTypeLabel(licenseData.cargoType)}
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
          
          {/* Exibir veículos da linha de frente */}
          {license.firstTrailerId && (
            <div className="rounded border border-gray-100 shadow-none overflow-hidden bg-white">
              <div className="flex justify-between items-center py-1.5 px-2">
                <div className="flex flex-col">
                  <span className="font-medium text-xs text-gray-800">1ª Carreta</span>
                  <span className="text-[10px] text-gray-500">
                    ID: {license.firstTrailerId}
                  </span>
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
                  <span className="text-[10px] text-gray-500">
                    ID: {license.dollyId}
                  </span>
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
                  <span className="text-[10px] text-gray-500">
                    ID: {license.secondTrailerId}
                  </span>
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
                  <span className="text-[10px] text-gray-500">
                    ID: {license.flatbedId}
                  </span>
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
        
        {/* Exibir placas adicionais */}
        {license.additionalPlates && license.additionalPlates.length > 0 && (
          <div className="mt-3 border-t pt-2">
            <h4 className="font-medium text-xs text-gray-700 mb-1.5">Placas Adicionais ({license.additionalPlates.length})</h4>
            <div className="flex flex-wrap gap-1.5">
              {license.additionalPlates.map((plate, index) => (
                <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  {plate}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-2 text-right text-xs text-gray-500">
          Total: {1 + 
            (license.firstTrailerId ? 1 : 0) + 
            (license.dollyId ? 1 : 0) + 
            (license.secondTrailerId ? 1 : 0) + 
            (license.flatbedId ? 1 : 0)} veículos na composição + 
          {license.additionalPlates?.length || 0} placas adicionais
        </div>
      </div>
    </div>
  );
}