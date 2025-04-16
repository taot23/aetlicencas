import { db, pool } from './server/db.js';
import { vehicles } from './shared/schema.js';
import { sql } from 'drizzle-orm';

// Função para gerar placas no formato Mercosul aleatórias sem repetição
function gerarPlacaMercosul(placasExistentes) {
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numeros = '0123456789';
  
  let novaPlaca;
  do {
    // Formato: AAA0A00
    novaPlaca = '';
    
    // Primeiras 3 letras
    for (let i = 0; i < 3; i++) {
      novaPlaca += letras.charAt(Math.floor(Math.random() * letras.length));
    }
    
    // 1 número
    novaPlaca += numeros.charAt(Math.floor(Math.random() * numeros.length));
    
    // 1 letra
    novaPlaca += letras.charAt(Math.floor(Math.random() * letras.length));
    
    // 2 números
    for (let i = 0; i < 2; i++) {
      novaPlaca += numeros.charAt(Math.floor(Math.random() * numeros.length));
    }
  } while (placasExistentes.includes(novaPlaca));
  
  return novaPlaca;
}

// Função para gerar Renavam aleatório
function gerarRenavam() {
  let renavam = '';
  for (let i = 0; i < 11; i++) {
    renavam += Math.floor(Math.random() * 10).toString();
  }
  return renavam;
}

// Marcas e modelos para unidades tratoras
const marcasTratoras = ['SCANIA', 'VOLVO', 'MERCEDES-BENZ', 'DAF', 'IVECO', 'MAN'];
const modelosTratores = ['R 450', 'FH 460', 'ACTROS 2651', 'XF 105', 'S-WAY', 'TGX'];

// Marcas e modelos para semirreboques
const marcasSemirreboques = ['RANDON', 'GUERRA', 'FACCHINI', 'NOMA', 'LIBRELATO', 'KRONE'];
const modelosSemirreboques = ['SR GR', 'SLIM', 'SRB', 'BITREM', 'RODOTREM', 'VANDERLEIA'];

async function addVehicles() {
  try {
    console.log('Iniciando inserção de veículos...');
    
    // Verificar placas existentes para evitar duplicatas
    const existingVehicles = await db.select({ plate: vehicles.plate }).from(vehicles);
    const placasExistentes = existingVehicles.map(v => v.plate);
    
    // Inserir unidade tratora
    const tractorPlate = gerarPlacaMercosul(placasExistentes);
    placasExistentes.push(tractorPlate);
    
    const tractorMarcaIndex = Math.floor(Math.random() * marcasTratoras.length);
    const tractorModeloIndex = Math.floor(Math.random() * modelosTratores.length);
    
    await db.insert(vehicles).values({
      userId: 2, // ID do usuário transportador
      plate: tractorPlate,
      renavam: gerarRenavam(),
      type: 'tractor_unit',
      brand: marcasTratoras[tractorMarcaIndex],
      model: modelosTratores[tractorModeloIndex],
      axles: 3,
      documentUrl: null
    });
    
    console.log(`Unidade tratora criada com sucesso: ${tractorPlate}`);
    
    // Inserir 20 semirreboques
    console.log('Inserindo 20 semirreboques...');
    
    for (let i = 0; i < 20; i++) {
      const semiTrailerPlate = gerarPlacaMercosul(placasExistentes);
      placasExistentes.push(semiTrailerPlate);
      
      const semiTrailerMarcaIndex = Math.floor(Math.random() * marcasSemirreboques.length);
      const semiTrailerModeloIndex = Math.floor(Math.random() * modelosSemirreboques.length);
      
      await db.insert(vehicles).values({
        userId: 2, // ID do usuário transportador
        plate: semiTrailerPlate,
        renavam: gerarRenavam(),
        type: 'semi_trailer',
        brand: marcasSemirreboques[semiTrailerMarcaIndex],
        model: modelosSemirreboques[semiTrailerModeloIndex],
        axles: Math.floor(Math.random() * 3) + 2, // 2 a 4 eixos
        documentUrl: null
      });
      
      console.log(`Semirreboque ${i+1}/20 criado: ${semiTrailerPlate}`);
    }
    
    console.log('Inserção de veículos concluída com sucesso!');
  } catch (error) {
    console.error('Erro ao inserir veículos:', error);
  } finally {
    // Encerrar a conexão com o pool
    await pool.end();
    console.log('Conexão com o banco de dados encerrada');
  }
}

// Executar a função principal
addVehicles();