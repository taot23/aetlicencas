import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { v4 as uuidv4 } from "uuid";
import { 
  insertUserSchema, 
  insertVehicleSchema, 
  insertLicenseRequestSchema, 
  insertDraftLicenseSchema, 
  updateLicenseStatusSchema,
  LicenseStatus
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

// Adicionar middleware para processar dados JSON dentro do formulário
const processVehicleData = (req: any, res: any, next: any) => {
  console.log('Processing request body:', req.body);
  
  if (req.body && req.body.vehicleData) {
    try {
      req.body = {
        ...req.body,
        ...JSON.parse(req.body.vehicleData)
      };
      console.log('Processed vehicle data:', req.body);
    } catch (error) {
      console.error('Error parsing vehicleData JSON:', error);
    }
  }
  
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

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
  app.get('/api/admin/licenses', requireAdmin, async (req, res) => {
    try {
      const licenses = await storage.getAllLicenseRequests();
      res.json(licenses);
    } catch (error) {
      console.error('Error fetching all license requests:', error);
      res.status(500).json({ message: 'Erro ao buscar todas as solicitações de licenças' });
    }
  });

  app.patch('/api/admin/licenses/:id/status', requireAdmin, upload.single('licenseFile'), async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
