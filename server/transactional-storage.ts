import { 
  users, type User, type InsertUser,
  vehicles, type Vehicle, type InsertVehicle,
  transporters, type Transporter, type InsertTransporter,
  licenseRequests, type LicenseRequest, type InsertLicenseRequest, type UpdateLicenseStatus, 
  type UpdateLicenseState, LicenseStatus, LicenseType
} from "@shared/schema";
import { eq, and, desc, asc, sql, gt, lt, like, not, isNull, or } from "drizzle-orm";
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
  sessionStore: any;

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
  
  async linkTransporterToUser(transporterId: number, userId: number | null): Promise<Transporter> {
    // Verificar se o transportador existe
    const transporter = await this.getTransporterById(transporterId);
    if (!transporter) {
      throw new Error("Transportador não encontrado");
    }
    
    // Se userId for null, estamos apenas removendo a vinculação
    if (userId !== null) {
      // Verificar se o usuário existe
      const user = await this.getUser(userId);
      if (!user) {
        throw new Error("Usuário não encontrado");
      }
    }
    
    // Atualizar o transportador
    const [updatedTransporter] = await db
      .update(transporters)
      .set({ userId })
      .where(eq(transporters.id, transporterId))
      .returning();
    
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
    return await db
      .select()
      .from(vehicles);
  }
  
  async getAllVehicles(): Promise<Vehicle[]> {
    return await db.select().from(vehicles);
  }
  
  async createVehicle(userId: number, vehicleData: InsertVehicle & { crlvUrl?: string | null }): Promise<Vehicle> {
    const [vehicle] = await db
      .insert(vehicles)
      .values({
        userId: userId,
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
  
  async createLicenseRequest(userId: number, licenseData: InsertLicenseRequest & { requestNumber: string, isDraft: boolean }): Promise<LicenseRequest> {
    const [licenseRequest] = await db
      .insert(licenseRequests)
      .values({
        userId,
        transporterId: licenseData.transporterId,
        requestNumber: licenseData.requestNumber,
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
        isDraft: licenseData.isDraft,
        comments: licenseData.comments,
        licenseFileUrl: licenseData.licenseFileUrl || null,
        validUntil: licenseData.validUntil || null
      })
      .returning();
    
    return licenseRequest;
  }
  
  async createLicenseDraft(userId: number, draftData: InsertLicenseRequest & { requestNumber: string, isDraft: boolean }): Promise<LicenseRequest> {
    // Assegurar que é um rascunho
    draftData.isDraft = true;
    return this.createLicenseRequest(userId, draftData);
  }
  
  async updateLicenseDraft(id: number, draftData: Partial<LicenseRequest>): Promise<LicenseRequest> {
    const updateData = {
      ...draftData,
      updatedAt: new Date()
    };
    
    const [updatedDraft] = await db
      .update(licenseRequests)
      .set(updateData)
      .where(
        and(
          eq(licenseRequests.id, id),
          eq(licenseRequests.isDraft, true)
        )
      )
      .returning();
    
    if (!updatedDraft) {
      throw new Error("Rascunho de licença não encontrado");
    }
    
    return updatedDraft;
  }
  
  async submitLicenseDraft(id: number, requestNumber: string): Promise<LicenseRequest> {
    // Verificar se o rascunho existe
    const draft = await this.getLicenseRequestById(id);
    if (!draft || !draft.isDraft) {
      throw new Error("Rascunho de licença não encontrado");
    }
    
    // Atualizar o rascunho para um pedido real
    const [licenseRequest] = await db
      .update(licenseRequests)
      .set({
        isDraft: false,
        requestNumber,
        status: "pending_registration",
        updatedAt: new Date()
      })
      .where(eq(licenseRequests.id, id))
      .returning();
    
    return licenseRequest;
  }
  
  async getLicenseDraftsByUserId(userId: number): Promise<LicenseRequest[]> {
    return await db
      .select()
      .from(licenseRequests)
      .where(
        and(
          eq(licenseRequests.userId, userId),
          eq(licenseRequests.isDraft, true)
        )
      )
      .orderBy(desc(licenseRequests.createdAt));
  }
  
  async getIssuedLicensesByUserId(userId: number): Promise<LicenseRequest[]> {
    return await db
      .select()
      .from(licenseRequests)
      .where(
        and(
          eq(licenseRequests.userId, userId),
          eq(licenseRequests.isDraft, false),
          or(
            eq(licenseRequests.status, "approved"),
            // Incluir licenças que tenham pelo menos um estado com status 'approved'
            sql`EXISTS (
              SELECT 1 FROM unnest(${licenseRequests.stateStatuses}) as state_status
              WHERE state_status LIKE '%:approved'
            )`
          )
        )
      )
      .orderBy(desc(licenseRequests.createdAt));
  }
  
  async updateLicenseStateStatus(data: UpdateLicenseState): Promise<LicenseRequest> {
    // Verificar se a licença existe
    const license = await this.getLicenseRequestById(data.licenseId);
    if (!license) {
      throw new Error("Pedido de licença não encontrado");
    }
    
    // Preparar os dados de atualização
    let stateStatuses = [...(license.stateStatuses || [])];
    const newStateStatus = `${data.state}:${data.status}`;
    
    // Verificar se o estado já existe na lista
    const existingIndex = stateStatuses.findIndex(s => s.startsWith(`${data.state}:`));
    if (existingIndex >= 0) {
      stateStatuses[existingIndex] = newStateStatus;
    } else {
      stateStatuses.push(newStateStatus);
    }
    
    // Atualizar arquivo do estado se fornecido
    let stateFiles = [...(license.stateFiles || [])];
    if (data.stateFile && typeof data.stateFile !== 'string') {
      const newStateFile = `${data.state}:${data.stateFile.path}`;
      
      const existingFileIndex = stateFiles.findIndex(s => s.startsWith(`${data.state}:`));
      if (existingFileIndex >= 0) {
        stateFiles[existingFileIndex] = newStateFile;
      } else {
        stateFiles.push(newStateFile);
      }
    }
    
    // Executar a atualização
    const [updatedLicense] = await db
      .update(licenseRequests)
      .set({
        stateStatuses,
        stateFiles,
        updatedAt: new Date()
      })
      .where(eq(licenseRequests.id, data.licenseId))
      .returning();
    
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
  async getDashboardStats(userId: number): Promise<DashboardStats> {
    // Usar a nova função otimizada para estatísticas
    const stats = await getDashboardStatsCombined();
    
    // Se for um usuário específico (não admin), filtrar adequadamente
    let recentLicensesQuery = db
      .select()
      .from(licenseRequests)
      .where(eq(licenseRequests.isDraft, false));
    
    // Se não for usuário admin (userId 0), aplicar filtro por userId
    if (userId !== 0) {
      recentLicensesQuery = recentLicensesQuery.where(eq(licenseRequests.userId, userId));
    }
    
    const recentLicenses = await recentLicensesQuery
      .orderBy(desc(licenseRequests.createdAt))
      .limit(5);
    
    return {
      ...stats,
      recentLicenses
    };
  }
  
  async getVehicleStats(userId: number): Promise<ChartData[]> {
    // Admin (userId 0) vê todos os veículos 
    // Usuários comuns veem apenas os seus
    let query = sql`
      SELECT type, COUNT(*) as count
      FROM ${vehicles}
    `;
    
    if (userId !== 0) {
      query = sql`
        SELECT type, COUNT(*) as count
        FROM ${vehicles}
        WHERE user_id = ${userId}
      `;
    }
    
    query = sql`${query} GROUP BY type ORDER BY count DESC`;
    
    const result = await db.execute(query);
    
    return result.rows.map((row: any) => ({
      name: this.getVehicleTypeLabel(row.type),
      value: Number(row.count)
    }));
  }
  
  async getStateStats(userId: number): Promise<ChartData[]> {
    // Admin (userId 0) vê todos os estados
    // Usuários comuns veem apenas os seus
    let query = sql`
      WITH expanded_states AS (
        SELECT id, unnest(states) as state
        FROM ${licenseRequests}
        WHERE is_draft = false
    `;
    
    if (userId !== 0) {
      query = sql`${query} AND user_id = ${userId}`;
    }
    
    query = sql`${query})
      SELECT state, COUNT(*) as count
      FROM expanded_states
      GROUP BY state
      ORDER BY count DESC
    `;
    
    const result = await db.execute(query);
    
    return result.rows.map((row: any) => ({
      name: row.state,
      value: Number(row.count)
    }));
  }
  
  // Método auxiliar para converter códigos de tipo de veículo para rótulos legíveis
  private getVehicleTypeLabel(type: string): string {
    const typeMap: Record<string, string> = {
      'tractor': 'Unidade Tratora',
      'semi_trailer': 'Semirreboque',
      'trailer': 'Reboque',
      'dolly': 'Dolly',
      'flatbed': 'Prancha'
    };
    
    return typeMap[type] || type;
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