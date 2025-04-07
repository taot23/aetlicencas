import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getVehicleTypeLabel(type: string): string {
  const vehicleTypes: Record<string, string> = {
    tractor_unit: "Unidade Tratora (Cavalo)",
    semi_trailer: "Semirreboque",
    trailer: "Reboque",
    dolly: "Dolly",
    flatbed: "Prancha"
  };
  
  return vehicleTypes[type] || type;
}

export function getLicenseTypeLabel(type: string): string {
  const licenseTypes: Record<string, string> = {
    roadtrain_9_axles: "Rodotrem 9 eixos",
    bitrain_9_axles: "Bitrem 9 eixos",
    bitrain_7_axles: "Bitrem 7 eixos",
    bitrain_6_axles: "Bitrem 6 eixos",
    flatbed: "Prancha",
    rodotrain: "Rodotrem 9 eixos" // Para compatibilidade
  };
  
  return licenseTypes[type] || type;
}
