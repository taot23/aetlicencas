import { Express } from "express";
import { db } from "./db";
import { licenseRequests } from "@shared/schema";
import { eq } from "drizzle-orm";

export function setupDebugRoutes(app: Express) {
  // Endpoint para diagnóstico direto da licença
  app.get('/api/debug/license/:id', async (req, res) => {
    try {
      const licenseId = parseInt(req.params.id);
      console.log(`[DEBUG] Iniciando diagnóstico para licença ${licenseId}`);
      
      // Buscar diretamente no banco para diagnóstico
      const query = await db
        .select()
        .from(licenseRequests)
        .where(eq(licenseRequests.id, licenseId));
      
      if (query.length === 0) {
        return res.status(404).json({ error: "Licença não encontrada" });
      }
      
      const license = query[0];
      console.log("[DEBUG] Licença encontrada:", license.id);
      console.log("[DEBUG] State statuses brutos:", license.stateStatuses);
      
      // Validar cada estado
      let stateStatusesClean = [];
      if (Array.isArray(license.stateStatuses)) {
        console.log("[DEBUG] Total de stateStatuses:", license.stateStatuses.length);
        
        stateStatusesClean = license.stateStatuses.filter(status => 
          status && typeof status === 'string' && status.includes(':')
        );
        
        console.log("[DEBUG] Após limpeza, total de stateStatusesClean válidos:", stateStatusesClean.length);
      } else {
        console.log("[DEBUG] stateStatuses não é um array");
      }
      
      // Verificar cada estado individualmente
      if (license.states && Array.isArray(license.states)) {
        console.log("[DEBUG] Estados da licença:", license.states);
        
        // Construir um mapa de estado -> status para diagnóstico
        const stateStatusMap = {};
        if (Array.isArray(license.stateStatuses)) {
          for (const status of license.stateStatuses) {
            if (typeof status === 'string' && status.includes(':')) {
              const [state, statusValue] = status.split(':');
              stateStatusMap[state] = statusValue;
            }
          }
        }
        
        console.log("[DEBUG] Mapeamento de estados para status:", stateStatusMap);
      }
      
      res.json({
        license,
        diagnostics: {
          hasStateStatusesArray: Array.isArray(license.stateStatuses),
          stateStatusesCount: Array.isArray(license.stateStatuses) ? license.stateStatuses.length : 0,
          validStateStatusesCount: stateStatusesClean.length,
          stateStatusesClean,
          statesCount: Array.isArray(license.states) ? license.states.length : 0
        }
      });
    } catch (error) {
      console.error("[DEBUG] Erro no diagnóstico:", error);
      res.status(500).json({ error: String(error) });
    }
  });
  
  // Endpoint para diagnóstico da serialização do estado via WebSocket
  app.get('/api/debug/websocket/:id', async (req, res) => {
    try {
      const licenseId = parseInt(req.params.id);
      console.log(`[DEBUG] Preparando mensagem WebSocket para licença ${licenseId}`);
      
      // Buscar licença
      const query = await db
        .select()
        .from(licenseRequests)
        .where(eq(licenseRequests.id, licenseId));
      
      if (query.length === 0) {
        return res.status(404).json({ error: "Licença não encontrada" });
      }
      
      const license = query[0];
      
      // Verificar se stateStatuses é um array válido
      const stateStatusesToSend = Array.isArray(license.stateStatuses) && license.stateStatuses.length > 0
        ? license.stateStatuses
        : [];
        
      console.log("[DEBUG] stateStatuses para envio:", JSON.stringify(stateStatusesToSend));
      
      // Criar uma cópia limpa da licença para garantir serialização correta
      const sanitizedLicense = {
        ...license,
        stateStatuses: stateStatusesToSend,
        createdAt: license.createdAt ? new Date(license.createdAt).toISOString() : null,
        updatedAt: license.updatedAt ? new Date(license.updatedAt).toISOString() : null,
        validUntil: license.validUntil ? new Date(license.validUntil).toISOString() : null
      };
      
      // Montar a mensagem que seria enviada pelo WebSocket
      const wsMessage = {
        type: 'STATUS_UPDATE',
        data: {
          licenseId: license.id,
          state: "TEST",
          status: "pending_registration",
          updatedAt: new Date().toISOString(),
          stateStatuses: stateStatusesToSend,
          license: sanitizedLicense
        }
      };
      
      res.json({
        wsMessage,
        diagnostics: {
          hasStateStatusesArray: Array.isArray(license.stateStatuses),
          stateStatusesCount: Array.isArray(license.stateStatuses) ? license.stateStatuses.length : 0
        }
      });
    } catch (error) {
      console.error("[DEBUG] Erro no diagnóstico WebSocket:", error);
      res.status(500).json({ error: String(error) });
    }
  });
  
  // Rota de diagnóstico para testar a API REST direta
  app.get('/api/debug/json-response', async (req, res) => {
    res.json({
      message: "API REST funcionando corretamente",
      timestamp: new Date().toISOString()
    });
  });
}