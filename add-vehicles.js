// Script para adicionar 20 placas de semirreboque para o usuário transportador@teste.com
import { db, pool } from './server/db.js';
import { eq } from 'drizzle-orm';
import * as schema from './shared/schema.js';

const { users, vehicles } = schema;

async function addVehicles() {
  try {
    // Encontrar o ID do usuário transportador@teste.com
    const [user] = await db.select().from(users).where(eq(users.email, 'transportador@teste.com'));
    
    if (!user) {
      console.error('Usuário transportador@teste.com não encontrado');
      process.exit(1);
    }
    
    console.log(`Adicionando 20 veículos tipo semirreboque para o usuário ${user.fullName} (ID: ${user.id})`);
    
    // Gerar 20 placas aleatórias no formato Mercosul
    const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numeros = '0123456789';
    
    const placas = [];
    
    // Função para gerar uma placa aleatória no formato Mercosul
    function gerarPlacaMercosul() {
      let placa = '';
      // Formato Mercosul: ABC1D23
      for (let i = 0; i < 3; i++) {
        placa += letras.charAt(Math.floor(Math.random() * letras.length));
      }
      placa += numeros.charAt(Math.floor(Math.random() * numeros.length));
      placa += letras.charAt(Math.floor(Math.random() * letras.length));
      for (let i = 0; i < 2; i++) {
        placa += numeros.charAt(Math.floor(Math.random() * numeros.length));
      }
      return placa;
    }
    
    // Gerar placas únicas
    while (placas.length < 20) {
      const placa = gerarPlacaMercosul();
      if (!placas.includes(placa)) {
        placas.push(placa);
      }
    }
    
    // Criar 20 veículos com as placas geradas
    for (const placa of placas) {
      await db.insert(vehicles).values({
        userId: user.id,
        plate: placa,
        type: 'Semirreboque',
        brand: 'Randon',
        model: 'SR',
        year: 2023,
        renavam: Math.floor(10000000000 + Math.random() * 90000000000).toString(),
        axles: 3,
        capacity: 30000,
        tare: 8000,
        createdAt: new Date()
      });
      console.log(`Veículo com placa ${placa} adicionado com sucesso`);
    }
    
    console.log('Todos os veículos foram adicionados com sucesso!');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Erro ao adicionar veículos:', error);
    await pool.end();
    process.exit(1);
  } finally {
    // Garantir que a conexão seja fechada em qualquer caso
    try {
      await pool.end();
    } catch (err) {
      console.error('Erro ao fechar conexão:', err);
    }
  }
}

addVehicles();