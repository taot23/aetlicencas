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
