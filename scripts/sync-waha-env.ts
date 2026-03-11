import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Script definitivo para sincronizar credenciales de WAHA.
 * 
 * Estrategia de entrada:
 * 1. Si hay argumentos ("pnpm waha:sync ..."), los procesa.
 * 2. Si no hay argumentos, intenta leer del PORTAPAPELES (Windows).
 * 3. Fallback: lee STDIN con auto-timeout (no requiere Ctrl+Z).
 */
async function main() {
  let input = process.argv.slice(2).join(' ').trim();

  // Si no hay argumentos, probamos Magia: Leer el portapapeles de Windows
  if (!input) {
    console.log('📋 No pasaste argumentos. Intentando leer del portapapeles...');
    try {
      if (process.platform === 'win32') {
        input = execSync('powershell -NoProfile -Command "Get-Clipboard"', { encoding: 'utf8' });
      }
    } catch (e) {
      // Si falla el portapapeles, vamos a STDIN con timeout
    }
  }

  // Si sigue vacío, probamos STDIN pero sin pedir Ctrl+Z (termina solo tras 500ms de silencio)
  if (!input || input.trim() === '') {
    console.log('📝 Esperando pegado... (Pegá el texto ahora. El script procesará automáticamente en 1 segundo)');
    input = await readFromStdinWithTimeout(1000);
  }

  if (!input || input.trim() === '') {
    console.error('❌ Error: No se recibió ningún texto ni se encontró nada en el portapapeles.');
    process.exit(1);
  }

  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.error(`❌ Error: No se encontró el archivo .env en ${envPath}`);
    process.exit(1);
  }

  let envContent = fs.readFileSync(envPath, 'utf8');
  const targets = [
    'WAHA_API_KEY',
    'WAHA_DASHBOARD_USERNAME',
    'WAHA_DASHBOARD_PASSWORD',
    'WHATSAPP_SWAGGER_USERNAME',
    'WHATSAPP_SWAGGER_PASSWORD'
  ];

  console.log('\n--- Analizando Datos ---');
  let found = 0;
  const detected: Record<string, string> = {};

  for (const key of targets) {
    // Regex mejorada: ignora "waha | ", busca el KEY, luego = o : y captura el valor
    const regex = new RegExp(`${key}\\s*[=:]\\s*([^\\s,;"'|]+)`, 'i');
    const match = input.match(regex);

    if (match) {
      const val = match[1].trim();
      detected[key] = val;
      console.log(`✅ Hallado: ${key}`);
      found++;
    }
  }

  // Sincronización automática si falta alguna (Dashboard <-> Swagger)
  if (detected.WAHA_DASHBOARD_PASSWORD && !detected.WHATSAPP_SWAGGER_PASSWORD) detected.WHATSAPP_SWAGGER_PASSWORD = detected.WAHA_DASHBOARD_PASSWORD;
  if (!detected.WAHA_DASHBOARD_PASSWORD && detected.WHATSAPP_SWAGGER_PASSWORD) detected.WAHA_DASHBOARD_PASSWORD = detected.WHATSAPP_SWAGGER_PASSWORD;
  if (detected.WAHA_DASHBOARD_USERNAME && !detected.WHATSAPP_SWAGGER_USERNAME) detected.WHATSAPP_SWAGGER_USERNAME = detected.WAHA_DASHBOARD_USERNAME;
  if (!detected.WAHA_DASHBOARD_USERNAME && detected.WHATSAPP_SWAGGER_USERNAME) detected.WAHA_DASHBOARD_USERNAME = detected.WHATSAPP_SWAGGER_USERNAME;

  let updatedCount = 0;
  for (const [key, value] of Object.entries(detected)) {
    const envRegex = new RegExp(`^${key}=.*`, 'm');
    if (envRegex.test(envContent)) {
      envContent = envContent.replace(envRegex, `${key}=${value}`);
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    fs.writeFileSync(envPath, envContent);
    console.log(`\n✨ ¡Sincronizado! Se actualizaron ${updatedCount} campos en el .env.`);
  } else {
    console.error('\n❌ No se detectaron cambios necesarios. ¿Seguro que copiaste el texto correcto?');
  }
}

/**
 * Lee de STDIN y resuelve automáticamente después de 'timeout' ms de silencio.
 */
function readFromStdinWithTimeout(timeout: number): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    let timer: NodeJS.Timeout;

    const finish = () => {
      process.stdin.pause();
      resolve(data);
    };

    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', (chunk) => {
      data += chunk;
      if (timer) clearTimeout(timer);
      timer = setTimeout(finish, timeout);
    });

    // En caso de que se cierre el pipe inmediatamente (ej: echo "test" | script)
    process.stdin.on('end', () => {
      if (timer) clearTimeout(timer);
      resolve(data);
    });
  });
}

main().catch(err => {
  console.error('💥 Error:', err);
  process.exit(1);
});
