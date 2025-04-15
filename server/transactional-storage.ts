import { 
  users, type User, type InsertUser,
  vehicles, type Vehicle, type InsertVehicle,
  transporters, type Transporter, type InsertTransporter,
  licenseRequests, type LicenseRequest, type InsertLicenseRequest, type UpdateLicenseStatus, 
  type UpdateLicenseState, LicenseStatus, LicenseType
} from "@shared/schema";
import { eq, and, desc, asc, sql, gt, lt, like, not, isNull } from "drizzle-orm";
import { db, pool, withTransaction } from "./db";
import { IStorage, DashboardStats, ChartData } from "./storage";
import {
  getDashboardStatsCombined,
  getLicensesWithTransporters,
  getVehicleStatsByType,
  getLicenseStatsByState,
  performGlobalSearch,
  getSoonToExpireLicenses
} from "./queries";
import session from "express-session";
import connectPg from "connect-pg-simple";

// Configuração do store de sessão PostgreSQL
const PostgresSessionStore = connectPg(session);

/**
 * Implementação de armazenamento usando PostgreSQL com suporte a transações
 */
export class TransactionalStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }
  
  // Métodos relacionados a Usuários
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }
  
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getNonAdminUsers(): Promise<User[]> {
    return await db.select()
      .from(users)
      .where(
        and(
          eq(users.isAdmin, false),
          eq(users.role, "user")
        )
      );
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    
    if (!updatedUser) {
      throw new Error("Usuário não encontrado");
    }
    
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<void> {
    // Usando transação para garantir que todas as operações sejam concluídas
    // ou nenhuma delas seja
    await withTransaction(async (tx) => {
      // Primeiro, exclua todos os veículos do usuário
      await tx.delete(vehicles).where(eq(vehicles.userId, id));
      
      // Em seguida, exclua os transportadores do usuário
      await tx.delete(transporters).where(eq(transporters.userId, id));
      
      // Por fim, exclua o usuário
      const result = await tx.delete(users).where(eq(users.id, id)).returning();
      
      if (!result.length) {
        throw new Error("Usuário não encontrado");
      }
    });
  }
  
  // Métodos relacionados a Transportadores
  async getTransporterById(id: number): Promise<Transporter | undefined> {
    const [transporter] = await db
      .select()
      .from(transporters)
      .where(eq(transporters.id, id));
    
    return transporter;
  }
  
  async getTransporterByDocument(documentNumber: string): Promise<Transporter | undefined> {
    const [transporter] = await db
      .select()
      .from(transporters)
      .where(eq(transporters.documentNumber, documentNumber));
    
    return transporter;
  }
  
  async getAllTransporters(): Promise<Transporter[]> {
    return await db.select().from(transporters);
  }
  
  async getTransportersByUserId(userId: number): Promise<Transporter[]> {
    return await db
      .select()
      .from(transporters)
      .where(eq(transporters.userId, userId));
  }
  
  async createTransporter(transporterData: InsertTransporter): Promise<Transporter> {
    const [transporter] = await db
      .insert(transporters)
      .values({
        ...transporterData,
        // Garantir que campos JSON sejam objetos
        subsidiaries: transporterData.subsidiaries || [],
        documents: transporterData.documents || []
      })
      .returning();
    
    return transporter;
  }
  
  async updateTransporter(id: number, transporterData: Partial<Transporter>): Promise<Transporter> {
    const [updatedTransporter] = await db
      .update(transporters)
      .set(transporterData)
      .where(eq(transporters.id, id))
      .returning();
    
    if (!updatedTransporter) {
      throw new Error("Transportador não encontrado");
    }
    
    return updatedTransporter;
  }
  
  async deleteTransporter(id: number): Promise<void> {
    // Usando transação para garantir que todas as operações sejam concluídas
    // ou nenhuma delas seja
    await withTransaction(async (tx) => {
      // Primeiro, verifique se não existem licenças associadas
      const licenseCount = await tx
        .select({ count: sql`COUNT(*)` })
        .from(licenseRequests)
        .where(eq(licenseRequests.transporterId, id));

      if (licenseCount.length > 0 && Number(licenseCount[0].count) > 0) {
        throw new Error("Não é possível excluir um transportador que possui licenças associadas");
      }
      
      // Em seguida, exclua o transportador
      const result = await tx
        .delete(transporters)
        .where(eq(transporters.id, id))
        .returning();
      
      if (!result.length) {
        throw new Error("Transportador não encontrado");
      }
    });
  }
  
  // Métodos relacionados a Veículos
  async getVehicleById(id: number): Promise<Vehicle | undefined> {
    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, id));
    
    return vehicle;
  }
  
  async getVehicleByPlate(plate: string): Promise<Vehicle | undefined> {
    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.plate, plate));
    
    return vehicle;
  }
  
  async getVehiclesByUserId(userId: number): Promise<Vehicle[]> {
    return await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.userId, userId));
  }
  
  async getAllVehicles(): Promise<Vehicle[]> {
    return await db.select().from(vehicles);
  }
  
  async createVehicle(vehicleData: InsertVehicle & { userId: number }): Promise<Vehicle> {
    const [vehicle] = await db
      .insert(vehicles)
      .values({
        userId: vehicleData.userId,
        plate: vehicleData.plate,
        type: vehicleData.type,
        brand: vehicleData.brand || null,
        model: vehicleData.model || null,
        year: vehicleData.year || null,
        renavam: vehicleData.renavam || null,
        tare: vehicleData.tare,
        axleCount: vehicleData.axleCount || null,
        remarks: vehicleData.remarks || null,
        crlvYear: vehicleData.crlvYear,
        crlvUrl: vehicleData.crlvUrl || null,
        status: vehicleData.status || "active"
      })
      .returning();
    
    return vehicle;
  }
  
  async updateVehicle(id: number, vehicleData: Partial<Vehicle>): Promise<Vehicle> {
    const [updatedVehicle] = await db
      .update(vehicles)
      .set(vehicleData)
      .where(eq(vehicles.id, id))
      .returning();
    
    if (!updatedVehicle) {
      throw new Error("Veículo não encontrado");
    }
    
    return updatedVehicle;
  }
  
  async deleteVehicle(id: number): Promise<void> {
    // Usando transação para garantir que todas as operações sejam concluídas
    // ou nenhuma delas seja
    await withTransaction(async (tx) => {
      // Primeiro, verifique se não existem licenças associadas a este veículo
      const licenseWithVehicle = await tx
        .select({ count: sql`COUNT(*)` })
        .from(licenseRequests)
        .where(
          or(
            eq(licenseRequests.tractorUnitId, id),
            eq(licenseRequests.firstTrailerId, id),
            eq(licenseRequests.dollyId, id),
            eq(licenseRequests.secondTrailerId, id),
            eq(licenseRequests.flatbedId, id)
          )
        );

      if (licenseWithVehicle.length > 0 && Number(licenseWithVehicle[0].count) > 0) {
        throw new Error("Não é possível excluir um veículo que está associado a licenças");
      }
      
      // Em seguida, exclua o veículo
      const result = await tx
        .delete(vehicles)
        .where(eq(vehicles.id, id))
        .returning();
      
      if (!result.length) {
        throw new Error("Veículo não encontrado");
      }
    });
  }
  
  // Métodos relacionados a Pedidos de Licença
  async getLicenseRequestById(id: number): Promise<LicenseRequest | undefined> {
    const [licenseRequest] = await db
      .select()
      .from(licenseRequests)
      .where(eq(licenseRequests.id, id));
    
    return licenseRequest;
  }
  
  async getLicenseRequestsByUserId(userId: number): Promise<LicenseRequest[]> {
    return await db
      .select()
      .from(licenseRequests)
      .where(eq(licenseRequests.userId, userId))
      .orderBy(desc(licenseRequests.createdAt));
  }
  
  async getAllLicenseRequests(): Promise<LicenseRequest[]> {
    return await db
      .select()
      .from(licenseRequests)
      .orderBy(desc(licenseRequests.createdAt));
  }
  
  async getLicenseRequestsByTransporterId(transporterId: number): Promise<LicenseRequest[]> {
    return await db
      .select()
      .from(licenseRequests)
      .where(eq(licenseRequests.transporterId, transporterId))
      .orderBy(desc(licenseRequests.createdAt));
  }
  
  async createLicenseRequest(licenseData: InsertLicenseRequest & { userId: number }): Promise<LicenseRequest> {
    // Gerar número de pedido único: AET-ANO-XXXXX
    const year = new Date().getFullYear();
    const countResult = await db
      .select({ count: sql`COUNT(*)` })
      .from(licenseRequests)
      .where(like(licenseRequests.requestNumber, `AET-${year}-%`));
    
    const count = Number(countResult[0].count) + 1;
    const requestNumber = `AET-${year}-${count.toString().padStart(5, '0')}`;
    
    const [licenseRequest] = await db
      .insert(licenseRequests)
      .values({
        userId: licenseData.userId,
        transporterId: licenseData.transporterId,
        requestNumber,
        type: licenseData.type,
        mainVehiclePlate: licenseData.mainVehiclePlate,
        tractorUnitId: licenseData.tractorUnitId,
        firstTrailerId: licenseData.firstTrailerId, 
        dollyId: licenseData.dollyId,
        secondTrailerId: licenseData.secondTrailerId,
        flatbedId: licenseData.flatbedId,
        length: licenseData.length,
        additionalPlates: licenseData.additionalPlates || [],
        additionalPlatesDocuments: licenseData.additionalPlatesDocuments || [],
        states: licenseData.states,
        status: licenseData.status || "pending_registration",
        stateStatuses: licenseData.stateStatuses || [],
        stateFiles: licenseData.stateFiles || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isDraft: licenseData.isDraft || false,
        comments: licenseData.comments,
        licenseFileUrl: licenseData.licenseFileUrl || "",
        validUntil: licenseData.validUntil
      })
      .returning();
    
    return licenseRequest;
  }
  
  async updateLicenseRequest(id: number, licenseData: Partial<LicenseRequest>): Promise<LicenseRequest> {
    const updateData = {
      ...licenseData,
      updatedAt: new Date()
    };
    
    const [updatedLicense] = await db
      .update(licenseRequests)
      .set(updateData)
      .where(eq(licenseRequests.id, id))
      .returning();
    
    if (!updatedLicense) {
      throw new Error("Pedido de licença não encontrado");
    }
    
    return updatedLicense;
  }
  
  async updateLicenseStatus(id: number, statusData: UpdateLicenseStatus): Promise<LicenseRequest> {
    // Verificar se a licença existe
    const license = await this.getLicenseRequestById(id);
    if (!license) {
      throw new Error("Pedido de licença não encontrado");
    }
    
    // Prepare os dados de atualização
    const updateData: Partial<LicenseRequest> = {
      status: statusData.status as LicenseStatus,
      comments: statusData.comments,
      updatedAt: new Date()
    };
    
    // Se houver validUntil e for uma string, convertê-la para Date
    if (statusData.validUntil) {
      updateData.validUntil = new Date(statusData.validUntil);
    }
    
    // Se houver licenseFileUrl, atualizá-la
    if (statusData.licenseFile && typeof statusData.licenseFile !== 'string') {
      updateData.licenseFileUrl = statusData.licenseFile.path;
    }
    
    // Atualizar status de um estado específico, se fornecido
    if (statusData.state && statusData.stateStatus) {
      const newStateStatus = `${statusData.state}:${statusData.stateStatus}`;
      let stateStatuses = [...(license.stateStatuses || [])];
      
      // Verificar se o estado já existe na lista
      const existingIndex = stateStatuses.findIndex(s => s.startsWith(`${statusData.state}:`));
      if (existingIndex >= 0) {
        stateStatuses[existingIndex] = newStateStatus;
      } else {
        stateStatuses.push(newStateStatus);
      }
      
      updateData.stateStatuses = stateStatuses;
      
      // Se houver um arquivo para o estado, atualizá-lo
      if (statusData.stateFile && typeof statusData.stateFile !== 'string') {
        const newStateFile = `${statusData.state}:${statusData.stateFile.path}`;
        let stateFiles = [...(license.stateFiles || [])];
        
        const existingFileIndex = stateFiles.findIndex(s => s.startsWith(`${statusData.state}:`));
        if (existingFileIndex >= 0) {
          stateFiles[existingFileIndex] = newStateFile;
        } else {
          stateFiles.push(newStateFile);
        }
        
        updateData.stateFiles = stateFiles;
      }
    }
    
    // Executar a atualização
    const [updatedLicense] = await db
      .update(licenseRequests)
      .set(updateData)
      .where(eq(licenseRequests.id, id))
      .returning();
    
    return updatedLicense;
  }
  
  async deleteLicenseRequest(id: number): Promise<void> {
    const result = await db
      .delete(licenseRequests)
      .where(eq(licenseRequests.id, id))
      .returning();
    
    if (!result.length) {
      throw new Error("Pedido de licença não encontrado");
    }
  }
  
  // Métodos para obter estatísticas
  async getDashboardStats(): Promise<DashboardStats> {
    // Usar a nova função otimizada para estatísticas
    const stats = await getDashboardStatsCombined();
    
    // Buscar as licenças recentes
    const recentLicenses = await db
      .select()
      .from(licenseRequests)
      .where(eq(licenseRequests.isDraft, false))
      .orderBy(desc(licenseRequests.createdAt))
      .limit(5);
    
    return {
      ...stats,
      recentLicenses
    };
  }
  
  async getVehicleStats(): Promise<ChartData[]> {
    const result = await getVehicleStatsByType();
    
    return result.rows.map((row: any) => ({
      name: row.type,
      value: Number(row.count)
    }));
  }
  
  async getStateStats(): Promise<ChartData[]> {
    const result = await getLicenseStatsByState();
    
    return result.rows.map((row: any) => ({
      name: row.state,
      value: Number(row.count)
    }));
  }
  
  // Método para pesquisa global
  async search(term: string): Promise<any[]> {
    return performGlobalSearch(term);
  }
  
  // Método para obter licenças prestes a expirar
  async getSoonToExpireLicenses(): Promise<any[]> {
    const result = await getSoonToExpireLicenses();
    return result.rows;
  }
}