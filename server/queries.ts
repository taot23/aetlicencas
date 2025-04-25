import { sql } from 'drizzle-orm';
import { db } from './db';
import { licenseRequests, transporters, users, vehicles } from '@shared/schema';
import { count, eq, and, like, desc, gte, lte, inArray, isNull, not } from 'drizzle-orm';

/**
 * Interface para parâmetros de filtro de licenças
 */
export interface LicenseFilters {
  userId?: number;
  transporterId?: number;
  status?: string;
  isDraft?: boolean;
  mainVehiclePlate?: string;
  startDate?: Date;
  endDate?: Date;
  states?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Obtém estatísticas do painel de forma otimizada com uma única consulta SQL
 */
export async function getDashboardStatsCombined() {
  const result = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM ${licenseRequests} WHERE ${licenseRequests.status} = 'approved') as issued_licenses,
      (SELECT COUNT(*) FROM ${licenseRequests} WHERE ${licenseRequests.status} != 'approved' AND ${licenseRequests.status} != 'canceled' AND ${licenseRequests.isDraft} = false) as pending_licenses,
      (SELECT COUNT(*) FROM ${vehicles}) as registered_vehicles,
      (SELECT COUNT(*) FROM ${vehicles} WHERE ${vehicles.status} = 'active') as active_vehicles
  `);
  
  if (!result.rows || result.rows.length === 0) {
    return {
      issuedLicenses: 0,
      pendingLicenses: 0,
      registeredVehicles: 0,
      activeVehicles: 0
    };
  }
  
  const stats = result.rows[0];
  return {
    issuedLicenses: Number(stats.issued_licenses) || 0,
    pendingLicenses: Number(stats.pending_licenses) || 0,
    registeredVehicles: Number(stats.registered_vehicles) || 0,
    activeVehicles: Number(stats.active_vehicles) || 0
  };
}

/**
 * Obtém licenças com informações do transportador em uma única consulta
 */
export async function getLicensesWithTransporters(filters: LicenseFilters = {}) {
  try {
    // Construindo uma query dinâmica com sql-template-strings
    let query = sql`
      SELECT l.*, t.name as transporter_name, t.document_number as transporter_document, u.email as user_email
      FROM ${licenseRequests} l
      LEFT JOIN ${transporters} t ON l.transporter_id = t.id
      LEFT JOIN ${users} u ON l.user_id = u.id
      WHERE 1=1
    `;
    
    // Adicionar condições de filtro
    if (filters.userId) {
      query = sql`${query} AND l.user_id = ${filters.userId}`;
    }
    
    if (filters.transporterId) {
      query = sql`${query} AND l.transporter_id = ${filters.transporterId}`;
    }
    
    if (filters.status) {
      query = sql`${query} AND l.status = ${filters.status}`;
    }
    
    if (filters.isDraft !== undefined) {
      query = sql`${query} AND l.is_draft = ${filters.isDraft}`;
    }
    
    if (filters.mainVehiclePlate) {
      query = sql`${query} AND l.main_vehicle_plate ILIKE ${`%${filters.mainVehiclePlate}%`}`;
    }
    
    if (filters.startDate) {
      query = sql`${query} AND l.created_at >= ${filters.startDate}`;
    }
    
    if (filters.endDate) {
      query = sql`${query} AND l.created_at <= ${filters.endDate}`;
    }
    
    // Adicionar ordenação
    query = sql`${query} ORDER BY l.created_at DESC`;
    
    // Adicionar limit e offset
    if (filters.limit) {
      query = sql`${query} LIMIT ${filters.limit}`;
      
      if (filters.offset) {
        query = sql`${query} OFFSET ${filters.offset}`;
      }
    }
    
    console.log("Executando consulta SQL com filtros aplicados");
    
    // Executar a consulta
    return await db.execute(query);
  } catch (error) {
    console.error("Erro na consulta getLicensesWithTransporters:", error);
    throw error;
  }
}

/**
 * Obtém estatísticas de veículos por tipo
 */
export async function getVehicleStatsByType() {
  return await db.execute(sql`
    SELECT type, COUNT(*) as count
    FROM ${vehicles}
    GROUP BY type
    ORDER BY count DESC
  `);
}

/**
 * Obtém estatísticas de veículos por estado de licença
 */
export async function getLicenseStatsByState() {
  // Este é um exemplo de consulta complexa que processa arrays do PostgreSQL
  return await db.execute(sql`
    WITH expanded_states AS (
      SELECT id, unnest(states) as state
      FROM ${licenseRequests}
      WHERE is_draft = false
    )
    SELECT state, COUNT(*) as count
    FROM expanded_states
    GROUP BY state
    ORDER BY count DESC
  `);
}

/**
 * Obtém veículos com informações de usuário e contagem de licenças
 */
export async function getVehiclesWithUserAndLicenses(userId?: number) {
  const whereClause = userId ? sql`WHERE v.user_id = ${userId}` : sql``;
  
  return await db.execute(sql`
    SELECT 
      v.*,
      u.email as user_email,
      u.full_name as user_name,
      (
        SELECT COUNT(*) 
        FROM ${licenseRequests} l 
        WHERE l.main_vehicle_plate = v.plate
      ) as license_count
    FROM ${vehicles} v
    LEFT JOIN ${users} u ON v.user_id = u.id
    ${whereClause}
    ORDER BY v.created_at DESC
  `);
}

/**
 * Busca licenças que expiram em breve (próximos 30 dias)
 */
export async function getSoonToExpireLicenses() {
  const today = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(today.getDate() + 30);
  
  return await db.execute(sql`
    SELECT l.*, t.name as transporter_name
    FROM ${licenseRequests} l
    LEFT JOIN ${transporters} t ON l.transporter_id = t.id
    WHERE 
      l.valid_until IS NOT NULL AND
      l.valid_until > ${today} AND
      l.valid_until <= ${thirtyDaysFromNow} AND
      l.status = 'approved'
    ORDER BY l.valid_until ASC
  `);
}

/**
 * Realiza uma pesquisa em múltiplas tabelas simultaneamente
 */
export async function performGlobalSearch(searchTerm: string) {
  const pattern = `%${searchTerm}%`;
  
  // Busca em veículos
  const vehiclesResult = await db.execute(sql`
    SELECT 'vehicle' as type, id, plate as title, status as subtitle, NULL as transporter_name
    FROM ${vehicles}
    WHERE plate ILIKE ${pattern} OR type ILIKE ${pattern}
    LIMIT 5
  `);
  
  // Busca em transportadores
  const transportersResult = await db.execute(sql`
    SELECT 'transporter' as type, id, name as title, document_number as subtitle, name as transporter_name
    FROM ${transporters}
    WHERE name ILIKE ${pattern} OR document_number ILIKE ${pattern}
    LIMIT 5
  `);
  
  // Busca em licenças
  const licensesResult = await db.execute(sql`
    SELECT 'license' as type, l.id, l.request_number as title, l.status as subtitle, t.name as transporter_name
    FROM ${licenseRequests} l
    LEFT JOIN ${transporters} t ON l.transporter_id = t.id
    WHERE l.request_number ILIKE ${pattern} OR l.main_vehicle_plate ILIKE ${pattern}
    LIMIT 5
  `);
  
  // Combina os resultados
  return [
    ...vehiclesResult.rows,
    ...transportersResult.rows,
    ...licensesResult.rows
  ];
}