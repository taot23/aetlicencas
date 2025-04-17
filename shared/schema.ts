import { pgTable, text, serial, integer, boolean, timestamp, json, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define enum para os tipos de role/perfil de usuário
export const userRoleEnum = z.enum([
  "admin", // Administrador (acesso completo)
  "operational", // Operacional (gerenciamento de licenças e veículos)
  "supervisor", // Supervisor (papel intermediário)
  "manager", // Gerente (papel com permissões estendidas)
  "user" // Usuário transportador padrão
]);

export type UserRole = z.infer<typeof userRoleEnum>;

// Define enum para tipos de pessoa
export const personTypeEnum = z.enum([
  "pj", // Pessoa Jurídica
  "pf"  // Pessoa Física
]);

export type PersonType = z.infer<typeof personTypeEnum>;

// Transportador model
export const transporters = pgTable("transporters", {
  id: serial("id").primaryKey(),
  personType: text("person_type").notNull(), // PJ ou PF
  
  // Campos comuns
  name: text("name").notNull(), // Razão Social (PJ) ou Nome Completo (PF)
  documentNumber: text("document_number").notNull().unique(), // CNPJ ou CPF
  email: text("email").notNull(),
  phone: text("phone"),
  
  // Campos específicos PJ
  tradeName: text("trade_name"), // Nome Fantasia
  legalResponsible: text("legal_responsible"), // Responsável Legal
  
  // Campos específicos PF
  birthDate: text("birth_date"), // Data de Nascimento para PF
  nationality: text("nationality"), // Nacionalidade para PF
  idNumber: text("id_number"), // RG para PF
  idIssuer: text("id_issuer"), // Órgão Emissor do RG
  idState: text("id_state"), // UF do RG
  
  // Endereço
  street: text("street"), // Logradouro
  number: text("number"), // Número
  complement: text("complement"), // Complemento
  district: text("district"), // Bairro
  zipCode: text("zip_code"), // CEP
  city: text("city"), // Cidade
  state: text("state"), // UF
  
  // Filiais (apenas para PJ)
  subsidiaries: json("subsidiaries").default('[]'), // Array com filiais (CNPJ, nome, endereço, etc)
  
  // Arquivos
  documents: json("documents").default('[]'), // URLs dos documentos anexados
  
  // Campo para retro-compatibilidade
  contact1Name: text("contact1_name"),
  contact1Phone: text("contact1_phone"),
  contact2Name: text("contact2_name"),
  contact2Phone: text("contact2_phone"),
  
  userId: integer("user_id").references(() => users.id), // Referência para o usuário vinculado
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    documentNumberIdx: uniqueIndex("idx_transporter_document").on(table.documentNumber),
    userIdIdx: index("idx_transporter_user_id").on(table.userId),
    nameIdx: index("idx_transporter_name").on(table.name)
  };
});

// Esquema JSON para filiais (subsidiárias)
export const subsidiarySchema = z.object({
  cnpj: z.string().min(14, "CNPJ deve ter pelo menos 14 dígitos"),
  name: z.string().min(3, "Razão social deve ter pelo menos 3 caracteres"),
  tradeName: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  zipCode: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  documents: z.array(z.string()).optional().default([]),
});

// Esquema JSON para documentos
export const documentSchema = z.object({
  type: z.string(), // "social_contract", "power_of_attorney", etc.
  url: z.string(),
  filename: z.string(),
});

// Schema para inserção/atualização de transportador
export const insertTransporterSchema = z.object({
  personType: personTypeEnum,
  
  // Campos comuns
  name: z.string().min(3, "Nome/Razão Social deve ter pelo menos 3 caracteres"),
  documentNumber: z.string().min(11, "Documento deve ter pelo menos 11 dígitos"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  
  // Campos específicos PJ
  tradeName: z.string().optional(),
  legalResponsible: z.string().optional(),
  
  // Campos específicos PF
  birthDate: z.string().optional(),
  nationality: z.string().optional(),
  idNumber: z.string().optional(),
  idIssuer: z.string().optional(),
  idState: z.string().optional(),
  
  // Endereço
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  district: z.string().optional(),
  zipCode: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  
  // Filiais (apenas para PJ)
  subsidiaries: z.array(subsidiarySchema).optional().default([]),
  
  // Arquivos
  documents: z.array(documentSchema).optional().default([]),
  
  // Campos para retro-compatibilidade
  contact1Name: z.string().optional(),
  contact1Phone: z.string().optional(),
  contact2Name: z.string().optional(),
  contact2Phone: z.string().optional(),
});

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  role: text("role").default("user").notNull(), // Novo campo: role como string (enum)
  isAdmin: boolean("is_admin").default(false).notNull(), // Mantido para compatibilidade
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    emailIdx: uniqueIndex("idx_user_email").on(table.email),
    roleIdx: index("idx_user_role").on(table.role)
  };
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  fullName: true,
  phone: true,
}).extend({
  role: userRoleEnum.optional().default("user"),
});

// Vehicle model
export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  plate: text("plate").notNull(),
  type: text("type").notNull(), // Unidade Tratora, Semirreboque, Reboque, Dolly, Prancha
  brand: text("brand"),
  model: text("model"),
  year: integer("year"),
  renavam: text("renavam"),
  tare: integer("tare").notNull(), // peso em kg
  axleCount: integer("axle_count"), // Quantidade de eixos
  remarks: text("remarks"),
  crlvYear: integer("crlv_year").notNull(),
  crlvUrl: text("crlv_url"),
  status: text("status").default("active").notNull(),
}, (table) => {
  return {
    plateIdx: index("idx_vehicle_plate").on(table.plate),
    userIdIdx: index("idx_vehicle_user_id").on(table.userId),
    statusIdx: index("idx_vehicle_status").on(table.status),
    typeIdx: index("idx_vehicle_type").on(table.type)
  };
});

export const insertVehicleSchema = createInsertSchema(vehicles)
  .omit({ id: true, userId: true })
  .extend({
    // Substituir validação de tare para aceitar números decimais
    tare: z.number().optional().default(0),
    axleCount: z.number().optional(),
    brand: z.string().optional(),
    model: z.string().optional(),
    year: z.number().optional(),
    renavam: z.string().optional(),
    remarks: z.string().optional(),
    crlvFile: z.any().optional(),
  });

// Enums for license status
export const licenseStatusEnum = z.enum([
  "pending_registration", // Pedido em Cadastramento
  "registration_in_progress", // Cadastro em Andamento
  "rejected", // Reprovado - Pendência de Documentação
  "under_review", // Análise do Órgão
  "pending_approval", // Pendente Liberação
  "approved", // Liberada
  "canceled", // Cancelado
]);

export type LicenseStatus = z.infer<typeof licenseStatusEnum>;

// License type enum
export const licenseTypeEnum = z.enum([
  "roadtrain_9_axles", // Rodotrem 9 eixos
  "bitrain_9_axles", // Bitrem 9 eixos
  "bitrain_7_axles", // Bitrem 7 eixos 
  "bitrain_6_axles", // Bitrem 6 eixos
  "flatbed", // Prancha
]);

export type LicenseType = z.infer<typeof licenseTypeEnum>;

// License requests model
export const licenseRequests = pgTable("license_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  transporterId: integer("transporter_id").references(() => transporters.id),
  requestNumber: text("request_number").notNull().unique(),
  type: text("type").notNull(), // From licenseTypeEnum
  mainVehiclePlate: text("main_vehicle_plate").notNull(),
  tractorUnitId: integer("tractor_unit_id").references(() => vehicles.id),
  firstTrailerId: integer("first_trailer_id").references(() => vehicles.id),
  dollyId: integer("dolly_id").references(() => vehicles.id),
  secondTrailerId: integer("second_trailer_id").references(() => vehicles.id),
  flatbedId: integer("flatbed_id").references(() => vehicles.id),
  length: integer("length").notNull(), // total length in cm
  width: integer("width"), // width in cm
  height: integer("height"), // height in cm
  additionalPlates: text("additional_plates").array(), // Lista de placas adicionais 
  additionalPlatesDocuments: text("additional_plates_documents").array(), // URLs dos documentos das placas adicionais
  states: text("states").array().notNull(),
  status: text("status").default("pending_registration").notNull(), // Status principal (legado)
  stateStatuses: text("state_statuses").array(), // Array com formato "ESTADO:STATUS" (ex: "SP:approved")
  stateFiles: text("state_files").array(), // Array com formato "ESTADO:URL" (ex: "SP:http://...pdf")
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isDraft: boolean("is_draft").default(true).notNull(),
  comments: text("comments"),
  licenseFileUrl: text("license_file_url").default(''),
  validUntil: timestamp("valid_until"),
}, (table) => {
  return {
    requestNumberIdx: uniqueIndex("idx_license_request_number").on(table.requestNumber),
    userIdIdx: index("idx_license_user_id").on(table.userId),
    transporterIdIdx: index("idx_license_transporter_id").on(table.transporterId),
    statusIdx: index("idx_license_status").on(table.status),
    isDraftIdx: index("idx_license_is_draft").on(table.isDraft),
    createdAtIdx: index("idx_license_created_at").on(table.createdAt),
    mainVehiclePlateIdx: index("idx_license_main_vehicle").on(table.mainVehiclePlate)
  };
});

export const insertLicenseRequestSchema = createInsertSchema(licenseRequests)
  .omit({ 
    id: true, 
    userId: true, 
    requestNumber: true, 
    createdAt: true, 
    updatedAt: true, 
    licenseFileUrl: true, 
    validUntil: true 
  })
  .extend({
    transporterId: z.number().positive("Um transportador deve ser selecionado"),
    states: z.array(z.string()).min(1, "Selecione pelo menos um estado"),
    length: z.coerce.number()
      .min(19.8, "O comprimento deve ser de no mínimo 19,80 metros")
      .max(30.0, "O comprimento deve ser de no máximo 30,00 metros")
      .refine(val => licenseTypeEnum.safeParse("flatbed").success ? true : val >= 19.8, "O comprimento deve ser de no mínimo 19,80 metros para este tipo de conjunto"),
    width: z.coerce.number().min(1, "A largura deve ser maior que 0").optional(),
    height: z.coerce.number().min(1, "A altura deve ser maior que 0").optional(),
    additionalPlates: z.array(z.string()).optional().default([]),
    additionalPlatesDocuments: z.array(z.string()).optional().default([]),
  });

export const insertDraftLicenseSchema = insertLicenseRequestSchema.partial().extend({
  type: licenseTypeEnum,
  isDraft: z.literal(true),
});

export const updateLicenseStatusSchema = createInsertSchema(licenseRequests)
  .pick({
    status: true,
    comments: true,
  })
  .extend({
    licenseFile: z.any().optional(),
    validUntil: z.string().optional(),
    state: z.string().optional(), // Estado específico sendo atualizado
    stateStatus: z.enum(licenseStatusEnum.options).optional(), // Status para o estado específico
    stateFile: z.any().optional(), // Arquivo para o estado específico
  });

// Schema para quando todos os estados forem setados, atualizar o status geral
export const updateLicenseStateSchema = z.object({
  licenseId: z.number(),
  state: z.string(),
  status: licenseStatusEnum,
  file: z.any().optional(),
  comments: z.string().optional(),
  validUntil: z.string().optional(),
  aetNumber: z.string().optional(), // Número da AET para o status "Análise do Órgão"
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Transporter = typeof transporters.$inferSelect;
export type InsertTransporter = z.infer<typeof insertTransporterSchema>;

export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;

export type LicenseRequest = typeof licenseRequests.$inferSelect;
export type InsertLicenseRequest = z.infer<typeof insertLicenseRequestSchema>;
export type InsertDraftLicense = z.infer<typeof insertDraftLicenseSchema>;
export type UpdateLicenseStatus = z.infer<typeof updateLicenseStatusSchema>;
export type UpdateLicenseState = z.infer<typeof updateLicenseStateSchema>;

export const brazilianStates = [
  { code: "SP", name: "São Paulo" },
  { code: "MG", name: "Minas Gerais" },
  { code: "MT", name: "Mato Grosso" },
  { code: "PE", name: "Pernambuco" },
  { code: "TO", name: "Tocantins" },
  { code: "MS", name: "Mato Grosso do Sul" },
  { code: "PR", name: "Paraná" },
  { code: "ES", name: "Espírito Santo" },
  { code: "DNIT", name: "DNIT" },
  { code: "RS", name: "Rio Grande do Sul" },
  { code: "BA", name: "Bahia" },
  { code: "PA", name: "Pará" },
  { code: "SC", name: "Santa Catarina" },
  { code: "DF", name: "Distrito Federal" },
  { code: "MA", name: "Maranhão" },
  { code: "GO", name: "Goiás" },
  { code: "RJ", name: "Rio de Janeiro" },
  { code: "CE", name: "Ceará" },
  { code: "AL", name: "Alagoas" },
  { code: "SE", name: "Sergipe" },
];

export const vehicleTypeOptions = [
  { value: "tractor_unit", label: "Unidade Tratora (Cavalo)" },
  { value: "semi_trailer", label: "Semirreboque" },
  { value: "trailer", label: "Reboque" },
  { value: "dolly", label: "Dolly" },
  { value: "flatbed", label: "Prancha" },
];
