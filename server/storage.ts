import { 
  users, type User, type InsertUser,
  vehicles, type Vehicle, type InsertVehicle,
  transporters, type Transporter, type InsertTransporter,
  licenseRequests, type LicenseRequest, type InsertLicenseRequest, type UpdateLicenseStatus, 
  type UpdateLicenseState, LicenseStatus, LicenseType
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Define o tipo de estatísticas do painel
export interface DashboardStats {
  issuedLicenses: number;
  pendingLicenses: number;
  registeredVehicles: number;
  activeVehicles: number;
  recentLicenses: Array<{
    id: number;
    requestNumber: string;
    type: string;
    mainVehiclePlate: string;
    states: string[];
    status: string;
    createdAt: string;
  }>;
}

export interface ChartData {
  name: string;
  value: number;
}

// Interface de armazenamento
export interface IStorage {
  // Métodos de usuário
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getNonAdminUsers(): Promise<User[]>;
  updateUser(id: number, userData: Partial<User>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  
  // Transportador methods
  getTransporterById(id: number): Promise<Transporter | undefined>;
  getTransporterByDocument(documentNumber: string): Promise<Transporter | undefined>;
  getAllTransporters(): Promise<Transporter[]>;
  createTransporter(transporter: InsertTransporter): Promise<Transporter>;
  updateTransporter(id: number, transporter: Partial<Transporter>): Promise<Transporter>;
  deleteTransporter(id: number): Promise<void>;
  linkTransporterToUser(transporterId: number, userId: number): Promise<Transporter>;
  
  // Vehicle methods
  getVehicleById(id: number): Promise<Vehicle | undefined>;
  getVehiclesByUserId(userId: number): Promise<Vehicle[]>;
  createVehicle(userId: number, vehicle: InsertVehicle & { crlvUrl?: string | null }): Promise<Vehicle>;
  updateVehicle(id: number, vehicle: Partial<Vehicle>): Promise<Vehicle>;
  deleteVehicle(id: number): Promise<void>;
  
  // License methods
  getLicenseRequestById(id: number): Promise<LicenseRequest | undefined>;
  getLicenseRequestsByUserId(userId: number): Promise<LicenseRequest[]>;
  getLicenseDraftsByUserId(userId: number): Promise<LicenseRequest[]>;
  getIssuedLicensesByUserId(userId: number): Promise<LicenseRequest[]>;
  getAllLicenseRequests(): Promise<LicenseRequest[]>;
  createLicenseRequest(userId: number, license: InsertLicenseRequest & { requestNumber: string, isDraft: boolean }): Promise<LicenseRequest>;
  createLicenseDraft(userId: number, draft: InsertLicenseRequest & { requestNumber: string, isDraft: boolean }): Promise<LicenseRequest>;
  updateLicenseDraft(id: number, draft: Partial<LicenseRequest>): Promise<LicenseRequest>;
  deleteLicenseRequest(id: number): Promise<void>;
  submitLicenseDraft(id: number, requestNumber: string): Promise<LicenseRequest>;
  updateLicenseStatus(id: number, statusUpdate: UpdateLicenseStatus & { licenseFileUrl?: string }): Promise<LicenseRequest>;
  updateLicenseStateStatus(data: UpdateLicenseState): Promise<LicenseRequest>;
  
  // Dashboard stats
  getDashboardStats(userId: number): Promise<DashboardStats>;
  getVehicleStats(userId: number): Promise<ChartData[]>;
  getStateStats(userId: number): Promise<ChartData[]>;
  
  // Session store
  sessionStore: session.SessionStore;
}

// Implementação de armazenamento em memória
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private transporters: Map<number, Transporter>;
  private vehicles: Map<number, Vehicle>;
  private licenseRequests: Map<number, LicenseRequest>;
  private currentUserId: number;
  private currentTransporterId: number;
  private currentVehicleId: number;
  private currentLicenseId: number;
  public sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.transporters = new Map();
    this.vehicles = new Map();
    this.licenseRequests = new Map();
    this.currentUserId = 1;
    this.currentTransporterId = 1;
    this.currentVehicleId = 1;
    this.currentLicenseId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // remove entradas expiradas a cada 24h
    });
    
    // Cria usuário administrador - autenticação de senha tratada por caso especial em auth.ts
    const id = this.currentUserId++;
    const adminUser: User = {
      id,
      email: "admin@sistema.com",
      password: "admin-special-password", // Este é apenas um marcador, verificação real está em auth.ts
      fullName: "Administrador",
      phone: "(11) 99999-9999",
      isAdmin: true
    };
    this.users.set(id, adminUser);
  }

  // Métodos de usuário
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async createUser(userData: InsertUser & { isAdmin?: boolean }): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...userData, 
      id,
      isAdmin: userData.isAdmin || false,
      createdAt: new Date().toISOString()
    };
    this.users.set(id, user);
    return user;
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async getNonAdminUsers(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => !user.isAdmin);
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error("Usuário não encontrado");
    }
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<void> {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error("Usuário não encontrado");
    }
    
    this.users.delete(id);
  }
  
  // Métodos de transportador
  async getTransporterById(id: number): Promise<Transporter | undefined> {
    return this.transporters.get(id);
  }
  
  async getTransporterByDocument(documentNumber: string): Promise<Transporter | undefined> {
    return Array.from(this.transporters.values()).find(
      (transporter) => transporter.documentNumber === documentNumber
    );
  }
  
  async getAllTransporters(): Promise<Transporter[]> {
    return Array.from(this.transporters.values());
  }
  
  async createTransporter(transporterData: InsertTransporter): Promise<Transporter> {
    const id = this.currentTransporterId++;
    const now = new Date();
    
    const transporter: Transporter = {
      ...transporterData,
      id,
      userId: transporterData.userId || null,
      createdAt: now.toISOString()
    };
    
    this.transporters.set(id, transporter);
    return transporter;
  }
  
  async updateTransporter(id: number, transporterData: Partial<Transporter>): Promise<Transporter> {
    const transporter = await this.getTransporterById(id);
    if (!transporter) {
      throw new Error("Transportador não encontrado");
    }
    
    const updatedTransporter = { ...transporter, ...transporterData };
    this.transporters.set(id, updatedTransporter);
    return updatedTransporter;
  }
  
  async deleteTransporter(id: number): Promise<void> {
    const transporter = await this.getTransporterById(id);
    if (!transporter) {
      throw new Error("Transportador não encontrado");
    }
    
    this.transporters.delete(id);
  }
  
  async linkTransporterToUser(transporterId: number, userId: number): Promise<Transporter> {
    const transporter = await this.getTransporterById(transporterId);
    if (!transporter) {
      throw new Error("Transportador não encontrado");
    }
    
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("Usuário não encontrado");
    }
    
    const updatedTransporter = { ...transporter, userId };
    this.transporters.set(transporterId, updatedTransporter);
    return updatedTransporter;
  }

  // Vehicle methods
  async getVehicleById(id: number): Promise<Vehicle | undefined> {
    return this.vehicles.get(id);
  }

  async getVehiclesByUserId(userId: number): Promise<Vehicle[]> {
    // Retorna todos os veículos quando userId=0 (caso especial para admin)
    if (userId === 0) {
      return Array.from(this.vehicles.values());
    }
    
    return Array.from(this.vehicles.values()).filter(
      (vehicle) => vehicle.userId === userId
    );
  }

  async createVehicle(userId: number, vehicleData: InsertVehicle & { crlvUrl?: string | null }): Promise<Vehicle> {
    const id = this.currentVehicleId++;
    const vehicle: Vehicle = { 
      ...vehicleData, 
      id,
      userId,
      status: vehicleData.status || "active",
      crlvUrl: vehicleData.crlvUrl || null
    };
    this.vehicles.set(id, vehicle);
    return vehicle;
  }

  async updateVehicle(id: number, vehicleData: Partial<Vehicle>): Promise<Vehicle> {
    const vehicle = this.vehicles.get(id);
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }
    
    const updatedVehicle: Vehicle = { ...vehicle, ...vehicleData };
    this.vehicles.set(id, updatedVehicle);
    return updatedVehicle;
  }

  async deleteVehicle(id: number): Promise<void> {
    this.vehicles.delete(id);
  }

  // License methods
  async getLicenseRequestById(id: number): Promise<LicenseRequest | undefined> {
    return this.licenseRequests.get(id);
  }

  async getLicenseRequestsByUserId(userId: number): Promise<LicenseRequest[]> {
    // Retorna todas as licenças quando userId=0 (caso especial para admin)
    if (userId === 0) {
      return Array.from(this.licenseRequests.values()).filter(
        (license) => !license.isDraft
      );
    }
    
    return Array.from(this.licenseRequests.values()).filter(
      (license) => license.userId === userId && !license.isDraft
    );
  }

  async getLicenseDraftsByUserId(userId: number): Promise<LicenseRequest[]> {
    // Retorna todos os rascunhos quando userId=0 (caso especial para admin)
    if (userId === 0) {
      return Array.from(this.licenseRequests.values()).filter(
        (license) => license.isDraft
      );
    }
    
    return Array.from(this.licenseRequests.values()).filter(
      (license) => license.userId === userId && license.isDraft
    );
  }

  async getIssuedLicensesByUserId(userId: number): Promise<LicenseRequest[]> {
    // Função helper para verificar se todos os estados de uma licença estão "liberada"
    const allStatesApproved = (license: LicenseRequest): boolean => {
      if (!license.stateStatuses || license.stateStatuses.length === 0) {
        return false;
      }
      
      // Verificar se todos os estados da licença têm status 'approved'
      return license.states.every(state => {
        const stateStatus = license.stateStatuses?.find(ss => ss.startsWith(`${state}:`))?.split(':')[1];
        return stateStatus === 'approved';
      });
    };
    
    // Caso especial para admin (userId=0)
    if (userId === 0) {
      return Array.from(this.licenseRequests.values()).filter(
        (license) => {
          // Incluir licenças onde todos os estados estão aprovados
          if (allStatesApproved(license)) return true;
          
          // Ou incluir licenças com status geral 'approved'
          if (license.status === 'approved') return true;
          
          // Ou incluir licenças que tenham pelo menos um estado com status 'approved'
          if (license.stateStatuses && license.stateStatuses.some(ss => ss.includes(':approved'))) {
            return true;
          }
          
          return false;
        }
      );
    }
    
    // Caso normal para usuários
    return Array.from(this.licenseRequests.values()).filter(
      (license) => {
        if (license.userId !== userId) return false;
        
        // Incluir licenças onde todos os estados estão aprovados
        if (allStatesApproved(license)) return true;
        
        // Ou incluir licenças com status geral 'approved'
        if (license.status === 'approved') return true;
        
        // Ou incluir licenças que tenham pelo menos um estado com status 'approved'
        if (license.stateStatuses && license.stateStatuses.some(ss => ss.includes(':approved'))) {
          return true;
        }
        
        return false;
      }
    );
  }

  async getAllLicenseRequests(): Promise<LicenseRequest[]> {
    return Array.from(this.licenseRequests.values()).filter(
      (license) => !license.isDraft
    );
  }

  async createLicenseRequest(userId: number, licenseData: InsertLicenseRequest & { requestNumber: string, isDraft: boolean }): Promise<LicenseRequest> {
    const id = this.currentLicenseId++;
    const now = new Date();
    
    const license: LicenseRequest = {
      ...licenseData,
      id,
      userId,
      requestNumber: licenseData.requestNumber,
      status: licenseData.isDraft ? 'pending_registration' : 'pending_registration',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      isDraft: licenseData.isDraft,
      additionalPlates: licenseData.additionalPlates || [],
      additionalPlatesDocuments: licenseData.additionalPlatesDocuments || [],
      comments: licenseData.comments || null,
      licenseFileUrl: null,
      validUntil: null
    };
    
    this.licenseRequests.set(id, license);
    return license;
  }

  async createLicenseDraft(userId: number, draftData: InsertLicenseRequest & { requestNumber: string, isDraft: boolean }): Promise<LicenseRequest> {
    return this.createLicenseRequest(userId, draftData);
  }

  async updateLicenseDraft(id: number, draftData: Partial<LicenseRequest>): Promise<LicenseRequest> {
    const draft = this.licenseRequests.get(id);
    if (!draft) {
      throw new Error("Draft not found");
    }
    
    const now = new Date();
    const updatedDraft: LicenseRequest = { 
      ...draft, 
      ...draftData,
      updatedAt: now.toISOString() 
    };
    
    this.licenseRequests.set(id, updatedDraft);
    return updatedDraft;
  }

  async deleteLicenseRequest(id: number): Promise<void> {
    this.licenseRequests.delete(id);
  }

  async submitLicenseDraft(id: number, requestNumber: string): Promise<LicenseRequest> {
    const draft = this.licenseRequests.get(id);
    if (!draft) {
      throw new Error("Draft not found");
    }
    
    const now = new Date();
    const licenseRequest: LicenseRequest = {
      ...draft,
      requestNumber,
      isDraft: false,
      updatedAt: now.toISOString()
    };
    
    this.licenseRequests.set(id, licenseRequest);
    return licenseRequest;
  }

  async updateLicenseStatus(id: number, statusUpdate: UpdateLicenseStatus & { licenseFileUrl?: string }): Promise<LicenseRequest> {
    const license = this.licenseRequests.get(id);
    if (!license) {
      throw new Error("License not found");
    }
    
    const now = new Date();
    let updatedLicense: LicenseRequest = {
      ...license,
      status: statusUpdate.status,
      comments: statusUpdate.comments || license.comments,
      updatedAt: now.toISOString(),
      licenseFileUrl: statusUpdate.licenseFileUrl || license.licenseFileUrl,
      validUntil: statusUpdate.validUntil || license.validUntil
    };
    
    // Se temos um estado específico para atualizar
    if (statusUpdate.state && statusUpdate.stateStatus) {
      // Inicializa arrays se necessário
      const stateStatuses = updatedLicense.stateStatuses || [];
      const stateFiles = updatedLicense.stateFiles || [];
      
      const stateStatusKey = `${statusUpdate.state}:${statusUpdate.stateStatus}`;
      
      // Remove status antigo para este estado, se existir
      const stateStatusIndex = stateStatuses.findIndex(s => s.startsWith(`${statusUpdate.state}:`));
      if (stateStatusIndex >= 0) {
        stateStatuses.splice(stateStatusIndex, 1);
      }
      
      // Adiciona novo status
      stateStatuses.push(stateStatusKey);
      
      // Se tiver arquivo, adiciona ou atualiza
      if (statusUpdate.stateFile) {
        const stateFileIndex = stateFiles.findIndex(f => f.startsWith(`${statusUpdate.state}:`));
        if (stateFileIndex >= 0) {
          stateFiles.splice(stateFileIndex, 1);
        }
        
        // Usa o caminho do arquivo salvo pelo middleware multer
        const fileUrl = `/uploads/${statusUpdate.stateFile.filename}`;
        stateFiles.push(`${statusUpdate.state}:${fileUrl}`);
      }
      
      updatedLicense = {
        ...updatedLicense,
        stateStatuses,
        stateFiles
      };
      
      // Verifica se todos os estados possuem status 'approved' e atualiza o status geral
      const allStatesApproved = updatedLicense.states.every(state => {
        const stateStatus = stateStatuses.find(ss => ss.startsWith(`${state}:`))?.split(':')[1];
        return stateStatus === 'approved';
      });
      
      if (allStatesApproved) {
        updatedLicense.status = 'approved';
      }
    }
    
    this.licenseRequests.set(id, updatedLicense);
    return updatedLicense;
  }
  
  // Método específico para atualizar apenas o status de um estado
  async updateLicenseStateStatus(data: UpdateLicenseState): Promise<LicenseRequest> {
    const { licenseId, state, status, file, comments, validUntil } = data;
    
    const license = this.licenseRequests.get(licenseId);
    if (!license) {
      throw new Error("License not found");
    }
    
    // Inicializa arrays se necessário
    const stateStatuses = license.stateStatuses || [];
    const stateFiles = license.stateFiles || [];
    
    // Remove status antigo para este estado, se existir
    const stateStatusIndex = stateStatuses.findIndex(s => s.startsWith(`${state}:`));
    if (stateStatusIndex >= 0) {
      stateStatuses.splice(stateStatusIndex, 1);
    }
    
    // Se for status "approved" e tiver data de validade, incluir no status
    if (status === "approved" && validUntil) {
      stateStatuses.push(`${state}:${status}:${validUntil}`);
    } else {
      // Adiciona novo status normal
      stateStatuses.push(`${state}:${status}`);
    }
    
    // Se tiver arquivo, adiciona ou atualiza
    if (file) {
      const stateFileIndex = stateFiles.findIndex(f => f.startsWith(`${state}:`));
      if (stateFileIndex >= 0) {
        stateFiles.splice(stateFileIndex, 1);
      }
      
      // Usa o caminho do arquivo salvo pelo middleware multer
      const fileUrl = `/uploads/${file.filename}`;
      stateFiles.push(`${state}:${fileUrl}`);
    }
    
    const now = new Date();
    const updatedLicense: LicenseRequest = {
      ...license,
      stateStatuses,
      stateFiles,
      updatedAt: now.toISOString(),
      comments: comments || license.comments
    };
    
    // Verifica se todos os estados possuem status 'approved' e atualiza o status geral
    const allStatesApproved = updatedLicense.states.every(state => {
      const stateStatus = stateStatuses.find(ss => ss.startsWith(`${state}:`))?.split(':')[1];
      return stateStatus === 'approved';
    });
    
    if (allStatesApproved) {
      updatedLicense.status = 'approved';
    }
    
    this.licenseRequests.set(licenseId, updatedLicense);
    return updatedLicense;
  }

  // Dashboard stats
  async getDashboardStats(userId: number): Promise<DashboardStats> {
    const userVehicles = await this.getVehiclesByUserId(userId);
    const userLicenses = await this.getLicenseRequestsByUserId(userId);
    
    // Sort licenses by createdAt descending for recent licenses
    const sortedLicenses = [...userLicenses].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    return {
      issuedLicenses: userLicenses.filter(license => license.status === 'approved').length,
      pendingLicenses: userLicenses.filter(license => license.status !== 'approved').length,
      registeredVehicles: userVehicles.length,
      activeVehicles: userVehicles.filter(vehicle => vehicle.status === 'active').length,
      recentLicenses: sortedLicenses.slice(0, 5).map(license => ({
        id: license.id,
        requestNumber: license.requestNumber,
        type: license.type,
        mainVehiclePlate: license.mainVehiclePlate,
        states: license.states,
        status: license.status,
        createdAt: license.createdAt
      }))
    };
  }

  async getVehicleStats(userId: number): Promise<ChartData[]> {
    const userVehicles = await this.getVehiclesByUserId(userId);
    
    // Count vehicles by type
    const vehicleTypeCount: Record<string, number> = {};
    userVehicles.forEach(vehicle => {
      const type = this.getVehicleTypeLabel(vehicle.type);
      vehicleTypeCount[type] = (vehicleTypeCount[type] || 0) + 1;
    });
    
    return Object.entries(vehicleTypeCount).map(([name, value]) => ({ name, value }));
  }

  async getStateStats(userId: number): Promise<ChartData[]> {
    const userLicenses = await this.getLicenseRequestsByUserId(userId);
    
    // Count licenses by state
    const stateCount: Record<string, number> = {};
    userLicenses.forEach(license => {
      license.states.forEach(state => {
        stateCount[state] = (stateCount[state] || 0) + 1;
      });
    });
    
    return Object.entries(stateCount).map(([name, value]) => ({ name, value }));
  }

  // Helper to convert vehicle type to label for stats
  private getVehicleTypeLabel(type: string): string {
    switch (type) {
      case "tractor_unit": return "Unidade Tratora";
      case "semi_trailer": return "Semirreboque";
      case "trailer": return "Reboque";
      case "dolly": return "Dolly";
      case "flatbed": return "Prancha";
      default: return type;
    }
  }
}

export const storage = new MemStorage();
