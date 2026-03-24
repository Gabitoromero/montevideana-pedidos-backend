import 'reflect-metadata';
import dotenv from 'dotenv';
import { initORM, closeORM, fork } from '../src/shared/db/orm.js';
import { Usuario } from '../src/modules/usuarios/usuario.entity.js';
import { HashUtil } from '../src/shared/utils/hash.js';

// Load environment variables
dotenv.config();

const COMMON_PINS = [
  '0000', '1234', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999',
  '1212', '1010', '4321', '2580', '1122', '5678'
];

async function recoverPincodes() {
  console.log('🚀 Iniciando recuperación de PINs...');
  console.log('⚠️  Este proceso utiliza fuerza bruta y puede tardar varias horas dependiendo del número de usuarios.');
  
  if (!process.env.PIN_HASH_SALT) {
    console.error('❌ Error: PIN_HASH_SALT no configurado en el archivo .env');
    process.exit(1);
  }
  
  try {
    const orm = await initORM();
    const em = fork();

    const usuarios = await em.find(Usuario, { activo: true });
    
    if (usuarios.length === 0) {
      console.log('⚠️ No se encontraron usuarios activos.');
      await closeORM();
      return;
    }

    console.log(`🔍 Buscando PINs para ${usuarios.length} usuarios...`);
    console.log('----------------------------------------------------------------------');
    console.log('ID | Username | Nombre   | PIN Recuperado | Método');
    console.log('----------------------------------------------------------------------');

    for (const usuario of usuarios) {
      let recoveredPin = 'No encontrado';
      let method = 'N/A';
      
      // 1. Probar PINs comunes primero (Rápido)
      for (const pinCandidate of COMMON_PINS) {
        if (await HashUtil.compare(pinCandidate, usuario.passwordHash)) {
          recoveredPin = pinCandidate;
          method = 'Común';
          break;
        }
      }

      // 2. Si no es común, probar fuerza bruta (Lento)
      if (recoveredPin === 'No encontrado') {
        process.stdout.write(`⏳ Brute-forcing ${usuario.username}... `);
        for (let i = 0; i <= 9999; i++) {
          const pinCandidate = i.toString().padStart(4, '0');
          // Saltar si ya se probó en COMMON_PINS
          if (COMMON_PINS.includes(pinCandidate)) continue;

          if (await HashUtil.compare(pinCandidate, usuario.passwordHash)) {
            recoveredPin = pinCandidate;
            method = 'Fuerza Bruta';
            break;
          }
          
          if (i % 1000 === 0 && i > 0) {
            process.stdout.write(`${i}... `);
          }
        }
        process.stdout.write('Hecho.\n');
      }

      if (recoveredPin !== 'No encontrado') {
        // Hachear el PIN recuperado para la nueva columna O(1)
        usuario.pinMovimiento = HashUtil.fastHash(recoveredPin);
        await em.flush();
        method += ' (Migrado ✅)';
      }

      console.log(`${usuario.id.toString().padEnd(2)} | ${usuario.username.padEnd(8)} | ${usuario.nombre.padEnd(8)} | ${recoveredPin.padEnd(14)} | ${method}`);
    }

    console.log('----------------------------------------------------------------------');
    console.log('✅ Proceso finalizado.');

    await closeORM();
  } catch (error) {
    console.error('\n❌ Error durante la recuperación:', error);
    process.exit(1);
  }
}

recoverPincodes();

