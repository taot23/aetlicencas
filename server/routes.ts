import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { v4 as uuidv4 } from "uuid";
import { 
  insertUserSchema, 
  insertVehicleSchema, 
  insertLicenseRequestSchema, 
  insertDraftLicenseSchema, 
  updateLicenseStatusSchema,
  updateLicenseStateSchema,
  LicenseStatus,
  userRoleEnum
} from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { promisify } from "util";

// Set up file storage for uploads
const uploadDir = path.join(process.cwd(), "uploads");
const ensureUploadDir = async () => {
  try {
    await fs.mkdir(uploadDir, { recursive: true });
  } catch (error) {
    console.error("Error creating upload directory:", error);
  }
};

ensureUploadDir();

const storage_config = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept only images and PDFs
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// Middleware para processar dados do veículo, tanto de FormData quanto JSON direto
const processVehicleData = (req: any, res: any, next: any) => {
  console.log('Processing request body:', req.body);
  
  // Se tiver contentType application/json, já está processado como JSON
  const contentType = req.headers['content-type'] || '';
  
  // Caso 1: Dados no formato FormData com campo vehicleData (abordagem antiga)
  if (req.body && req.body.vehicleData) {
    try {
      req.body = {
        ...req.body,
        ...JSON.parse(req.body.vehicleData)
      };
      console.log('Processed vehicle data from vehicleData field:', req.body);
    } catch (error) {
      console.error('Error parsing vehicleData JSON:', error);
    }
  } 
  // Caso 2: FormData com campos individuais (nossa nova abordagem)
  else if (contentType.includes('multipart/form-data') && req.body) {
    // Campos individuais já estão acessíveis em req.body
    console.log('Using form-data fields directly:', req.body);
    
    // Garantir que números são convertidos corretamente
    if (req.body.tare) req.body.tare = Number(req.body.tare);
    if (req.body.crlvYear) req.body.crlvYear = Number(req.body.crlvYear);
  }
  // Caso 3: JSON direto (nossa nova abordagem para requests sem arquivo)
  else if (contentType.includes('application/json')) {
    // Já processado como JSON pelo bodyParser
    console.log('Request is already in JSON format:', req.body);
  }
  
  console.log('Final vehicle data for processing:', req.body);
  next();
};

const upload = multer({ 
  storage: storage_config,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  }
});

// Authentication middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Não autenticado" });
  }
  next();
};

// Admin middleware
const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Não autenticado" });
  }
  
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: "Acesso negado" });
  }
  
  next();
};

// Middleware para usuários com papel Operacional
const requireOperational = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Não autenticado" });
  }
  
  // Verifica se o usuário tem papel Operacional
  if (req.user.role !== 'operational' && req.user.role !== 'supervisor' && !req.user.isAdmin) {
    return res.status(403).json({ 
      message: "Acesso negado. Apenas usuários com perfil Operacional ou Supervisor podem acessar." 
    });
  }
  
  next();
};

// Middleware para usuários com papel Supervisor
const requireSupervisor = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Não autenticado" });
  }
  
  // Verifica se o usuário tem papel Supervisor
  if (req.user.role !== 'supervisor' && !req.user.isAdmin) {
    return res.status(403).json({ 
      message: "Acesso negado. Apenas usuários com perfil Supervisor podem acessar." 
    });
  }
  
  next();
};

// Middleware para verificar se o usuário é dono do recurso ou tem papel de staff
const requireOwnerOrStaff = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Não autenticado" });
  }
  
  // Os perfis que podem acessar recursos de outros usuários
  const isStaff = ['operational', 'supervisor'].includes(req.user.role) || req.user.isAdmin;
  
  // Se o usuário não é staff, verifica se é o dono do recurso
  if (!isStaff) {
    const resourceUserId = parseInt(req.params.userId);
    if (req.user.id !== resourceUserId) {
      return res.status(403).json({ 
        message: "Acesso negado. Você só pode acessar seus próprios dados." 
      });
    }
  }
  
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Servir arquivos estáticos da pasta uploads
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Dashboard Stats
  app.get('/api/dashboard/stats', requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ message: 'Erro ao buscar estatísticas do dashboard' });
    }
  });

  app.get('/api/dashboard/vehicle-stats', requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const stats = await storage.getVehicleStats(userId);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching vehicle stats:', error);
      res.status(500).json({ message: 'Erro ao buscar estatísticas de veículos' });
    }
  });

  app.get('/api/dashboard/state-stats', requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const stats = await storage.getStateStats(userId);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching state stats:', error);
      res.status(500).json({ message: 'Erro ao buscar estatísticas por estado' });
    }
  });

  // Vehicles CRUD endpoints
  app.get('/api/vehicles', requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const vehicles = await storage.getVehiclesByUserId(userId);
      res.json(vehicles);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      res.status(500).json({ message: 'Erro ao buscar veículos' });
    }
  });

  app.post('/api/vehicles', requireAuth, upload.single('crlvFile'), processVehicleData, async (req, res) => {
    try {
      const userId = req.user.id;
      
      // Extrair dados do campo vehicleData (JSON string)
      let vehicleData;
      
      // Já processado pelo middleware processVehicleData
      vehicleData = { ...req.body };
      delete vehicleData.vehicleData; // Remove o campo vehicleData se presente
      console.log('Using processed vehicle data:', vehicleData);
      
      // Debug: log the request body
      console.log('Vehicle data received:', vehicleData);
      
      // Validate vehicle data
      try {
        insertVehicleSchema.parse(vehicleData);
      } catch (error: any) {
        console.log('Validation error:', error);
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      // Add file URL if provided
      let crlvUrl = null;
      if (req.file) {
        crlvUrl = `/uploads/${req.file.filename}`;
      }
      
      const vehicle = await storage.createVehicle(userId, {
        ...vehicleData,
        crlvUrl
      });
      
      res.status(201).json(vehicle);
    } catch (error) {
      console.error('Error creating vehicle:', error);
      res.status(500).json({ message: 'Erro ao criar veículo' });
    }
  });

  app.patch('/api/vehicles/:id', requireAuth, upload.single('crlvFile'), processVehicleData, async (req, res) => {
    try {
      const userId = req.user.id;
      const vehicleId = parseInt(req.params.id);
      
      // Check if vehicle exists and belongs to the user
      const existingVehicle = await storage.getVehicleById(vehicleId);
      if (!existingVehicle) {
        return res.status(404).json({ message: 'Veículo não encontrado' });
      }
      
      if (existingVehicle.userId !== userId) {
        return res.status(403).json({ message: 'Acesso negado' });
      }
      
      // Extrair dados do campo vehicleData (JSON string)
      let vehicleData;
      
      // Já processado pelo middleware processVehicleData
      vehicleData = { ...req.body };
      delete vehicleData.vehicleData; // Remove o campo vehicleData se presente
      console.log('Using processed vehicle update data:', vehicleData);
      
      // Validate vehicle data
      try {
        insertVehicleSchema.partial().parse(vehicleData);
      } catch (error: any) {
        console.log('Validation error on update:', error);
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      // Add file URL if provided
      if (req.file) {
        vehicleData.crlvUrl = `/uploads/${req.file.filename}`;
      }
      
      const updatedVehicle = await storage.updateVehicle(vehicleId, vehicleData);
      
      res.json(updatedVehicle);
    } catch (error) {
      console.error('Error updating vehicle:', error);
      res.status(500).json({ message: 'Erro ao atualizar veículo' });
    }
  });

  app.delete('/api/vehicles/:id', requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const vehicleId = parseInt(req.params.id);
      
      // Check if vehicle exists and belongs to the user
      const existingVehicle = await storage.getVehicleById(vehicleId);
      if (!existingVehicle) {
        return res.status(404).json({ message: 'Veículo não encontrado' });
      }
      
      if (existingVehicle.userId !== userId) {
        return res.status(403).json({ message: 'Acesso negado' });
      }
      
      await storage.deleteVehicle(vehicleId);
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      res.status(500).json({ message: 'Erro ao excluir veículo' });
    }
  });

  // License draft endpoints
  app.get('/api/licenses/drafts', requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const drafts = await storage.getLicenseDraftsByUserId(userId);
      res.json(drafts);
    } catch (error) {
      console.error('Error fetching license drafts:', error);
      res.status(500).json({ message: 'Erro ao buscar rascunhos de licenças' });
    }
  });

  app.post('/api/licenses/drafts', requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const draftData = { ...req.body };
      
      // Validate draft data
      try {
        insertDraftLicenseSchema.parse(draftData);
      } catch (error: any) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      // Generate a draft request number
      const draftNumber = `RASCUNHO-${uuidv4().substring(0, 8)}`;
      
      const draft = await storage.createLicenseDraft(userId, {
        ...draftData,
        requestNumber: draftNumber,
      });
      
      res.status(201).json(draft);
    } catch (error) {
      console.error('Error creating license draft:', error);
      res.status(500).json({ message: 'Erro ao criar rascunho de licença' });
    }
  });

  app.patch('/api/licenses/drafts/:id', requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const draftId = parseInt(req.params.id);
      
      // Check if draft exists and belongs to the user
      const existingDraft = await storage.getLicenseRequestById(draftId);
      if (!existingDraft) {
        return res.status(404).json({ message: 'Rascunho não encontrado' });
      }
      
      if (existingDraft.userId !== userId) {
        return res.status(403).json({ message: 'Acesso negado' });
      }
      
      const draftData = { ...req.body };
      
      // Validate draft data
      try {
        insertDraftLicenseSchema.partial().parse(draftData);
      } catch (error: any) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const updatedDraft = await storage.updateLicenseDraft(draftId, draftData);
      
      res.json(updatedDraft);
    } catch (error) {
      console.error('Error updating license draft:', error);
      res.status(500).json({ message: 'Erro ao atualizar rascunho de licença' });
    }
  });

  app.delete('/api/licenses/drafts/:id', requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const draftId = parseInt(req.params.id);
      
      // Check if draft exists and belongs to the user
      const existingDraft = await storage.getLicenseRequestById(draftId);
      if (!existingDraft) {
        return res.status(404).json({ message: 'Rascunho não encontrado' });
      }
      
      if (existingDraft.userId !== userId || !existingDraft.isDraft) {
        return res.status(403).json({ message: 'Acesso negado' });
      }
      
      await storage.deleteLicenseRequest(draftId);
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting license draft:', error);
      res.status(500).json({ message: 'Erro ao excluir rascunho de licença' });
    }
  });

  app.post('/api/licenses/drafts/:id/submit', requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const draftId = parseInt(req.params.id);
      
      // Check if draft exists and belongs to the user
      const existingDraft = await storage.getLicenseRequestById(draftId);
      if (!existingDraft) {
        return res.status(404).json({ message: 'Rascunho não encontrado' });
      }
      
      if (existingDraft.userId !== userId || !existingDraft.isDraft) {
        return res.status(403).json({ message: 'Acesso negado' });
      }
      
      // Generate a real request number
      const requestNumber = `AET-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
      
      // Submit the draft as a real license request
      const licenseRequest = await storage.submitLicenseDraft(draftId, requestNumber);
      
      res.json(licenseRequest);
    } catch (error) {
      console.error('Error submitting license draft:', error);
      res.status(500).json({ message: 'Erro ao enviar solicitação de licença' });
    }
  });

  // License request endpoints
  app.get('/api/licenses', requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const licenses = await storage.getLicenseRequestsByUserId(userId);
      res.json(licenses);
    } catch (error) {
      console.error('Error fetching license requests:', error);
      res.status(500).json({ message: 'Erro ao buscar solicitações de licenças' });
    }
  });

  app.post('/api/licenses', requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const licenseData = { ...req.body };
      
      // Validate license data
      try {
        insertLicenseRequestSchema.parse(licenseData);
      } catch (error: any) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      // Generate a request number
      const requestNumber = `AET-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
      
      const licenseRequest = await storage.createLicenseRequest(userId, {
        ...licenseData,
        requestNumber,
        isDraft: false,
      });
      
      res.status(201).json(licenseRequest);
    } catch (error) {
      console.error('Error creating license request:', error);
      res.status(500).json({ message: 'Erro ao criar solicitação de licença' });
    }
  });

  app.get('/api/licenses/issued', requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const issuedLicenses = await storage.getIssuedLicensesByUserId(userId);
      res.json(issuedLicenses);
    } catch (error) {
      console.error('Error fetching issued licenses:', error);
      res.status(500).json({ message: 'Erro ao buscar licenças emitidas' });
    }
  });

  // Admin endpoints
  // Endpoint para buscar todas as licenças - acessível para Admin, Operacional e Supervisor
  app.get('/api/admin/licenses', requireOperational, async (req, res) => {
    try {
      const licenses = await storage.getAllLicenseRequests();
      res.json(licenses);
    } catch (error) {
      console.error('Error fetching all license requests:', error);
      res.status(500).json({ message: 'Erro ao buscar todas as solicitações de licenças' });
    }
  });
  
  // Rota para admin check
  app.get('/api/admin/check', requireAuth, (req, res) => {
    const user = req.user!;
    
    if (user.isAdmin) {
      res.json({ message: "Acesso de administrador confirmado" });
    } else {
      res.status(403).json({ message: "Acesso negado" });
    }
  });
  
  // Dashboard Admin
  app.get('/api/admin/dashboard/stats', requireAdmin, async (req, res) => {
    try {
      // Como é admin, vamos pegar as estatísticas gerais, não específicas de um usuário
      const stats = await storage.getDashboardStats(0); // 0 = all users
      res.json(stats);
    } catch (error) {
      console.error('Error fetching admin dashboard stats:', error);
      res.status(500).json({ message: 'Erro ao buscar estatísticas do dashboard administrativo' });
    }
  });

  app.get('/api/admin/dashboard/vehicle-stats', requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getVehicleStats(0); // 0 = all users
      res.json(stats);
    } catch (error) {
      console.error('Error fetching admin vehicle stats:', error);
      res.status(500).json({ message: 'Erro ao buscar estatísticas de veículos administrativo' });
    }
  });

  app.get('/api/admin/dashboard/state-stats', requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getStateStats(0); // 0 = all users
      res.json(stats);
    } catch (error) {
      console.error('Error fetching admin state stats:', error);
      res.status(500).json({ message: 'Erro ao buscar estatísticas por estado administrativo' });
    }
  });
  
  // Rota para verificar acesso operacional
  app.get('/api/staff/check-operational', requireAuth, (req, res) => {
    const user = req.user!;
    
    if (user.role === 'operational' || user.role === 'supervisor' || user.isAdmin) {
      res.json({ 
        message: "Acesso de staff confirmado",
        role: user.role
      });
    } else {
      res.status(403).json({ message: "Acesso negado" });
    }
  });
  
  // Rota para verificar acesso supervisor
  app.get('/api/staff/check-supervisor', requireAuth, (req, res) => {
    const user = req.user!;
    
    if (user.role === 'supervisor' || user.isAdmin) {
      res.json({ 
        message: "Acesso de supervisor confirmado",
        role: user.role
      });
    } else {
      res.status(403).json({ message: "Acesso negado" });
    }
  });
  
  // Rota para listar os perfis de usuário disponíveis
  app.get('/api/roles', requireAuth, (req, res) => {
    // Lista os valores definidos no enum
    const roleValues = ["user", "operational", "supervisor", "admin", "manager"];
    res.json({ roles: roleValues });
  });
  
  // Rota para listagem de usuários (transportadores)
  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });
  
  // Rota para criação de usuários (transportadores)
  app.post('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      const { fullName, email, password, isAdmin, role = "user" } = req.body;
      
      // Verificar se já existe um usuário com este e-mail
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Este e-mail já está em uso" });
      }
      
      // Criar o usuário
      const hashedPassword = await hashPassword(password);
      const newUser = await storage.createUser({
        fullName,
        email,
        password: hashedPassword,
        phone: "",
        role: userRoleEnum.parse(role), // Garantir que o role seja válido
        isAdmin: !!isAdmin
      });
      
      // Remover a senha do objeto retornado
      const { password: _, ...userWithoutPassword } = newUser;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      res.status(500).json({ message: "Erro ao criar usuário" });
    }
  });
  
  // Rota para atualização de usuários (transportadores)
  app.patch('/api/admin/users/:id', requireAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "ID de usuário inválido" });
    }
    
    try {
      // Verificar se o usuário existe
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      const { fullName, email, password, isAdmin, role } = req.body;
      
      // Verificar se o e-mail já está em uso por outro usuário
      if (email !== existingUser.email) {
        const userWithEmail = await storage.getUserByEmail(email);
        if (userWithEmail && userWithEmail.id !== userId) {
          return res.status(400).json({ message: "Este e-mail já está em uso por outro usuário" });
        }
      }
      
      // Preparar os dados para atualização
      const updateData: any = {
        fullName,
        email,
        isAdmin: !!isAdmin
      };
      
      // Se o perfil for fornecido, atualizar
      if (role) {
        try {
          updateData.role = userRoleEnum.parse(role);
        } catch (error) {
          return res.status(400).json({ message: "Tipo de perfil inválido" });
        }
      }
      
      // Se foi fornecida uma nova senha, hash ela
      if (password) {
        updateData.password = await hashPassword(password);
      }
      
      // Atualizar o usuário
      const updatedUser = await storage.updateUser(userId, updateData);
      
      // Remover a senha do objeto retornado
      const { password: _, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      res.status(500).json({ message: "Erro ao atualizar usuário" });
    }
  });
  
  // Rota para exclusão de usuários (transportadores)
  app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "ID de usuário inválido" });
    }
    
    // Impedir que o administrador exclua a si mesmo
    if (userId === req.user!.id) {
      return res.status(400).json({ message: "Você não pode excluir sua própria conta" });
    }
    
    try {
      // Verificar se o usuário existe
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Excluir o usuário
      await storage.deleteUser(userId);
      
      res.json({ message: "Usuário excluído com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      res.status(500).json({ message: "Erro ao excluir usuário" });
    }
  });

  // Rotas para transportadores
  app.get('/api/admin/transporters', requireAdmin, async (req, res) => {
    try {
      const transporters = await storage.getAllTransporters();
      res.json(transporters);
    } catch (error) {
      console.error("Erro ao buscar transportadores:", error);
      res.status(500).json({ message: "Erro ao buscar transportadores" });
    }
  });
  
  app.post('/api/admin/transporters', requireAdmin, async (req, res) => {
    try {
      // Validar dados do transportador
      try {
        const { name, documentNumber, contact1Name, contact1Phone, contact2Name, contact2Phone, email, userId } = req.body;
        
        // Verificar se já existe um transportador com este documento
        const existingTransporter = await storage.getTransporterByDocument(documentNumber);
        if (existingTransporter) {
          return res.status(400).json({ message: "Este CPF/CNPJ já está cadastrado" });
        }
        
        // Se userId for fornecido, verificar se o usuário existe
        if (userId) {
          const user = await storage.getUser(userId);
          if (!user) {
            return res.status(400).json({ message: "Usuário não encontrado" });
          }
        }
        
        const transporter = await storage.createTransporter({
          name,
          documentNumber,
          contact1Name,
          contact1Phone,
          contact2Name,
          contact2Phone,
          email,
          userId: userId || null
        });
        
        res.status(201).json(transporter);
      } catch (error) {
        console.error("Erro ao validar dados do transportador:", error);
        return res.status(400).json({ message: "Dados inválidos" });
      }
    } catch (error) {
      console.error("Erro ao criar transportador:", error);
      res.status(500).json({ message: "Erro ao criar transportador" });
    }
  });
  
  app.get('/api/admin/transporters/:id', requireAdmin, async (req, res) => {
    try {
      const transporterId = parseInt(req.params.id);
      
      const transporter = await storage.getTransporterById(transporterId);
      if (!transporter) {
        return res.status(404).json({ message: "Transportador não encontrado" });
      }
      
      res.json(transporter);
    } catch (error) {
      console.error("Erro ao buscar transportador:", error);
      res.status(500).json({ message: "Erro ao buscar transportador" });
    }
  });
  
  app.patch('/api/admin/transporters/:id', requireAdmin, async (req, res) => {
    try {
      const transporterId = parseInt(req.params.id);
      
      // Verificar se o transportador existe
      const transporter = await storage.getTransporterById(transporterId);
      if (!transporter) {
        return res.status(404).json({ message: "Transportador não encontrado" });
      }
      
      // Se está atualizando o documento, verificar se já existe outro transportador com este documento
      if (req.body.documentNumber && req.body.documentNumber !== transporter.documentNumber) {
        const existingTransporter = await storage.getTransporterByDocument(req.body.documentNumber);
        if (existingTransporter && existingTransporter.id !== transporterId) {
          return res.status(400).json({ message: "Este CPF/CNPJ já está cadastrado para outro transportador" });
        }
      }
      
      // Se está atualizando o usuário vinculado, verificar se ele existe
      if (req.body.userId) {
        const user = await storage.getUser(req.body.userId);
        if (!user) {
          return res.status(400).json({ message: "Usuário não encontrado" });
        }
      }
      
      const updatedTransporter = await storage.updateTransporter(transporterId, req.body);
      
      res.json(updatedTransporter);
    } catch (error) {
      console.error("Erro ao atualizar transportador:", error);
      res.status(500).json({ message: "Erro ao atualizar transportador" });
    }
  });
  
  app.delete('/api/admin/transporters/:id', requireAdmin, async (req, res) => {
    try {
      const transporterId = parseInt(req.params.id);
      
      // Verificar se o transportador existe
      const transporter = await storage.getTransporterById(transporterId);
      if (!transporter) {
        return res.status(404).json({ message: "Transportador não encontrado" });
      }
      
      await storage.deleteTransporter(transporterId);
      
      res.status(204).send();
    } catch (error) {
      console.error("Erro ao excluir transportador:", error);
      res.status(500).json({ message: "Erro ao excluir transportador" });
    }
  });
  
  // Rota para vincular transportador a usuário
  app.post('/api/admin/transporters/:id/link', requireAdmin, async (req, res) => {
    try {
      const transporterId = parseInt(req.params.id);
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "ID do usuário é obrigatório" });
      }
      
      // Verificar se o transportador existe
      const transporter = await storage.getTransporterById(transporterId);
      if (!transporter) {
        return res.status(404).json({ message: "Transportador não encontrado" });
      }
      
      // Verificar se o usuário existe
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Vincular transportador ao usuário
      const updatedTransporter = await storage.linkTransporterToUser(transporterId, userId);
      
      res.json(updatedTransporter);
    } catch (error) {
      console.error("Erro ao vincular transportador a usuário:", error);
      res.status(500).json({ message: "Erro ao vincular transportador a usuário" });
    }
  });
  
  // Rota para obter usuários não-admin para seleção
  app.get('/api/admin/non-admin-users', requireAdmin, async (req, res) => {
    try {
      const users = await storage.getNonAdminUsers();
      res.json(users);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });

  // Rota para atualizar o status de uma licença - acessível para Admin, Operacional e Supervisor
app.patch('/api/admin/licenses/:id/status', requireOperational, upload.single('licenseFile'), async (req, res) => {
    try {
      const licenseId = parseInt(req.params.id);
      const statusData = { 
        status: req.body.status as LicenseStatus,
        comments: req.body.comments,
      };
      
      // Add validUntil if provided
      if (req.body.validUntil) {
        statusData.validUntil = new Date(req.body.validUntil).toISOString();
      }
      
      // Validate status data
      try {
        updateLicenseStatusSchema.parse(statusData);
      } catch (error: any) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      // Check if license exists
      const existingLicense = await storage.getLicenseRequestById(licenseId);
      if (!existingLicense) {
        return res.status(404).json({ message: 'Licença não encontrada' });
      }
      
      // Add file URL if provided
      let licenseFileUrl = existingLicense.licenseFileUrl;
      if (req.file) {
        licenseFileUrl = `/uploads/${req.file.filename}`;
      }
      
      // Update license status
      const updatedLicense = await storage.updateLicenseStatus(licenseId, {
        ...statusData,
        licenseFileUrl,
      });
      
      res.json(updatedLicense);
    } catch (error) {
      console.error('Error updating license status:', error);
      res.status(500).json({ message: 'Erro ao atualizar status da licença' });
    }
  });
  
  // Endpoint específico para atualizar o status de um estado específico em uma licença
  app.patch('/api/admin/licenses/:id/state-status', requireOperational, upload.single('stateFile'), async (req, res) => {
    try {
      const licenseId = parseInt(req.params.id);
      
      // Validar dados do status do estado
      const stateStatusData = {
        licenseId,
        state: req.body.state,
        status: req.body.status,
        comments: req.body.comments,
        validUntil: req.body.validUntil,
      };
      
      try {
        updateLicenseStateSchema.parse(stateStatusData);
      } catch (error: any) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      // Verificar se a licença existe
      const existingLicense = await storage.getLicenseRequestById(licenseId);
      if (!existingLicense) {
        return res.status(404).json({ message: 'Licença não encontrada' });
      }
      
      // Verificar se o estado está incluído na lista de estados da licença
      if (!existingLicense.states.includes(stateStatusData.state)) {
        return res.status(400).json({ message: 'Estado não incluído na solicitação da licença' });
      }
      
      // Adicionar arquivo se fornecido
      let file = null;
      if (req.file) {
        file = req.file;
      }
      
      // Atualizar status do estado da licença
      const updatedLicense = await storage.updateLicenseStateStatus({
        ...stateStatusData,
        file,
      });
      
      res.json(updatedLicense);
    } catch (error) {
      console.error('Error updating license state status:', error);
      res.status(500).json({ message: 'Erro ao atualizar status do estado da licença' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
