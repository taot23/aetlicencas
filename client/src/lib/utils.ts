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
    flatbed: "Prancha",
    truck: "Caminhão"
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
    rodotrain: "Rodotrem 9 eixos", // Para compatibilidade
    romeo_juliet: "Romeu e Julieta"
  };
  
  return licenseTypes[type] || type;
}

export function getCargoTypeLabel(cargoType: string | null | undefined): string {
  if (!cargoType) return "-";
  
  const cargoTypes: Record<string, string> = {
    dry_cargo: "Carga Seca",
    liquid_cargo: "Carga Líquida",
    live_cargo: "Carga Viva",
    sugar_cane: "Cana de Açúcar",
    indivisible_cargo: "Carga Indivisível",
    agricultural_machinery: "Máquinas Agrícolas",
    oversized: "SUPERDIMENSIONADA"
  };
  
  return cargoTypes[cargoType] || cargoType;
}

// Formatar data para exibição curta
export function formatShortDate(dateString: string | Date | undefined | null): string {
  if (!dateString) return "-";
  
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return "-";
  }
  
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Obter rótulo para cada estado
export function getStateLabel(stateCode: string): string {
  const states: Record<string, string> = {
    'SP': 'São Paulo',
    'MG': 'Minas Gerais',
    'RJ': 'Rio de Janeiro',
    'ES': 'Espírito Santo',
    'PR': 'Paraná',
    'SC': 'Santa Catarina',
    'RS': 'Rio Grande do Sul',
    'MS': 'Mato Grosso do Sul',
    'MT': 'Mato Grosso',
    'GO': 'Goiás',
    'DF': 'Distrito Federal',
    'BA': 'Bahia',
    'SE': 'Sergipe',
    'AL': 'Alagoas',
    'PE': 'Pernambuco',
    'PB': 'Paraíba',
    'RN': 'Rio Grande do Norte',
    'CE': 'Ceará',
    'PI': 'Piauí',
    'MA': 'Maranhão',
    'PA': 'Pará',
    'AP': 'Amapá',
    'AM': 'Amazonas',
    'RR': 'Roraima',
    'AC': 'Acre',
    'TO': 'Tocantins',
    'RO': 'Rondônia',
    'DNIT': 'DNIT',
  };
  
  return states[stateCode] || stateCode;
}

// Verificar se o usuário é admin
export function isAdminUser(user: any): boolean {
  return user?.isAdmin === true || user?.role === 'admin';
}

// Verificar se o usuário é operacional
export function isOperationalUser(user: any): boolean {
  return user?.role === 'operational' || user?.role === 'supervisor';
}
