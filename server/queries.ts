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
  // Construindo a query de forma diferente para evitar problemas com os parâmetros
  let queryStr = `
    SELECT l.*, t.name as transporter_name, t.document_number as transporter_document, u.email as user_email
    FROM "license_requests" l
    LEFT JOIN "transporters" t ON l.transporter_id = t.id
    LEFT JOIN "users" u ON l.user_id = u.id
    WHERE 1=1
  `;
  
  const params = [];
  let paramCount = 1;
  
  if (filters.userId) {
    queryStr += ` AND l.user_id = $${paramCount++}`;
    params.push(filters.userId);
  }
  
  if (filters.transporterId) {
    queryStr += ` AND l.transporter_id = $${paramCount++}`;
    params.push(filters.transporterId);
  }
  
  if (filters.status) {
    queryStr += ` AND l.status = $${paramCount++}`;
    params.push(filters.status);
  }
  
  if (filters.isDraft !== undefined) {
    queryStr += ` AND l.is_draft = $${paramCount++}`;
    params.push(filters.isDraft);
  }
  
  if (filters.mainVehiclePlate) {
    queryStr += ` AND l.main_vehicle_plate ILIKE $${paramCount++}`;
    params.push(`%${filters.mainVehiclePlate}%`);
  }
  
  if (filters.startDate) {
    queryStr += ` AND l.created_at >= $${paramCount++}`;
    params.push(filters.startDate);
  }
  
  if (filters.endDate) {
    queryStr += ` AND l.created_at <= $${paramCount++}`;
    params.push(filters.endDate);
  }
  
  // Adicione ordenação
  queryStr += ` ORDER BY l.created_at DESC`;
  
  // Adicione limit e offset se fornecidos
  if (filters.limit) {
    queryStr += ` LIMIT $${paramCount++}`;
    params.push(filters.limit);
    
    if (filters.offset) {
      queryStr += ` OFFSET $${paramCount++}`;
      params.push(filters.offset);
    }
  }
  
  return await db.execute(sql.raw(queryStr), params);
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