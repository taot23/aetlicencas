import { 
  users, type User, type InsertUser,
  vehicles, type Vehicle, type InsertVehicle,
  licenseRequests, type LicenseRequest, type InsertLicenseRequest, type UpdateLicenseStatus, 
  LicenseStatus, LicenseType
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Define dashboard stats type
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

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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
  
  // Dashboard stats
  getDashboardStats(userId: number): Promise<DashboardStats>;
  getVehicleStats(userId: number): Promise<ChartData[]>;
  getStateStats(userId: number): Promise<ChartData[]>;
  
  // Session store
  sessionStore: session.SessionStore;
}

// Memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private vehicles: Map<number, Vehicle>;
  private licenseRequests: Map<number, LicenseRequest>;
  private currentUserId: number;
  private currentVehicleId: number;
  private currentLicenseId: number;
  public sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.vehicles = new Map();
    this.licenseRequests = new Map();
    this.currentUserId = 1;
    this.currentVehicleId = 1;
    this.currentLicenseId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Create admin user - actual password authentication handled by special case in auth.ts
    const id = this.currentUserId++;
    const adminUser: User = {
      id,
      email: "admin@sistema.com",
      password: "admin-special-password", // This is just a placeholder as actual check is in auth.ts
      fullName: "Administrador",
      phone: "(11) 99999-9999",
      isAdmin: true
    };
    this.users.set(id, adminUser);
  }

  // User methods
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
      isAdmin: userData.isAdmin || false
    };
    this.users.set(id, user);
    return user;
  }

  // Vehicle methods
  async getVehicleById(id: number): Promise<Vehicle | undefined> {
    return this.vehicles.get(id);
  }

  async getVehiclesByUserId(userId: number): Promise<Vehicle[]> {
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
    return Array.from(this.licenseRequests.values()).filter(
      (license) => license.userId === userId && !license.isDraft
    );
  }

  async getLicenseDraftsByUserId(userId: number): Promise<LicenseRequest[]> {
    return Array.from(this.licenseRequests.values()).filter(
      (license) => license.userId === userId && license.isDraft
    );
  }

  async getIssuedLicensesByUserId(userId: number): Promise<LicenseRequest[]> {
    return Array.from(this.licenseRequests.values()).filter(
      (license) => license.userId === userId && license.status === 'approved'
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
    const updatedLicense: LicenseRequest = {
      ...license,
      status: statusUpdate.status,
      comments: statusUpdate.comments || license.comments,
      updatedAt: now.toISOString(),
      licenseFileUrl: statusUpdate.licenseFileUrl || license.licenseFileUrl,
      validUntil: statusUpdate.validUntil || license.validUntil
    };
    
    this.licenseRequests.set(id, updatedLicense);
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
