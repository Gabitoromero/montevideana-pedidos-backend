import 'dotenv/config';
import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import fs from 'fs';
import path from 'path';
import { sendDiscordAlert } from '../src/shared/utils/discord.js';

/**
 * Diagnóstico: ¿a qué hora real empieza CHESS a devolver comprobantes
 * con fecha de MAÑANA cuando se los consulta?
 *
 * Corre en loop, consultando cada INTERVALO_MIN minutos, y deja un log
 * en scripts/diagnostico-preventa-manana.log con:
 *   timestamp, huboDatos, totalComprobantes, cantidadPreventa
 *
 * Uso:
 *   pnpm tsx scripts/diagnostico-preventa-manana.ts [intervaloMinutos]
 *
 * Cortar con Ctrl+C. No toca la base de datos ni el resto del sistema,
 * solo hace GET de lectura contra CHESS.
 */

const INTERVALO_MIN = Number(process.argv[2]) || 5;
const LOG_PATH = path.resolve(process.cwd(), 'scripts/diagnostico-preventa-manana.log');

function formatFecha(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function mañana(): string {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return formatFecha(t);
}

async function crearCliente() {
  const baseURL = process.env.CHESS_API_URL;
  if (!baseURL) throw new Error('CHESS_API_URL no está en el .env');

  const jar = new CookieJar(undefined, { rejectPublicSuffixes: false, looseMode: true });
  const api = wrapper(
    axios.create({
      baseURL,
      timeout: 15000,
      jar,
      withCredentials: true,
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    })
  );
  return { api, jar, baseURL };
}

async function login(api: any, jar: CookieJar, baseURL: string) {
  const usuario = process.env.CHESS_USER;
  const password = process.env.CHESS_PASSWORD;
  if (!usuario || !password) throw new Error('CHESS_USER / CHESS_PASSWORD no están en el .env');

  const response = await api.post('web/api/chess/v1/auth/login', { usuario, password }, { timeout: 30000 });
  const sessionId = response.data?.sessionId;
  if (!sessionId) throw new Error('CHESS no devolvió sessionId en el login');

  const sessionValue = sessionId.replace('JSESSIONID=', '');
  const hostname = new URL(baseURL).hostname;
  await jar.setCookie(`JSESSIONID=${sessionValue}; Path=/; Domain=${hostname}`, baseURL, {
    loose: true,
    ignoreError: false,
  });
}

function parseTotalLotes(cantComprobantesVentas: string | undefined): number {
  if (!cantComprobantesVentas) return 0;
  const match = cantComprobantesVentas.match(/(\d+)\/(\d+)/);
  return match ? parseInt(match[2]) : 0;
}

async function consultarMañana(api: any) {
  const fecha = mañana();
  const response = await api.get('web/api/chess/v1/ventas/', {
    params: { fechaDesde: fecha, fechaHasta: fecha, empresas: '1', detallado: true, nroLote: 1 },
    timeout: 30000,
  });

  const totalLotes = parseTotalLotes(response.data?.cantComprobantesVentas);
  const ventas = response.data?.dsReporteComprobantesApi?.VentasResumen || [];
  const cantPreventa = ventas.filter((v: any) => v.origen === 'PREVENTA').length;

  return { fecha, totalLotes, cantidadEnLote1: ventas.length, cantPreventa };
}

function appendLog(linea: string) {
  fs.appendFileSync(LOG_PATH, linea + '\n', 'utf8');
  console.log(linea);
}

async function main() {
  console.log(`🔎 Diagnóstico preventa-mañana. Intervalo: ${INTERVALO_MIN} min. Log: ${LOG_PATH}`);
  console.log('   Cortar con Ctrl+C.\n');

  await sendDiscordAlert(
    `Arrancó el diagnóstico de preventa-mañana. Consultando CHESS cada ${INTERVALO_MIN} minutos para ver cuándo empieza a devolver comprobantes con fecha de mañana.`,
    'INFO'
  );

  const { api, jar, baseURL } = await crearCliente();
  let logueado = false;
  let yaAvisadoDatos = false; // evita spamear Discord: solo notifica la PRIMERA vez que aparecen datos

  const ciclo = async () => {
    const ahora = new Date().toISOString();
    try {
      if (!logueado) {
        await login(api, jar, baseURL);
        logueado = true;
      }

      const { fecha, totalLotes, cantidadEnLote1, cantPreventa } = await consultarMañana(api);
      const huboDatos = totalLotes > 0 || cantidadEnLote1 > 0;

      appendLog(
        `${ahora} | fechaConsultada=${fecha} | huboDatos=${huboDatos} | totalLotes=${totalLotes} | comprobantesLote1=${cantidadEnLote1} | preventaLote1=${cantPreventa}`
      );

      if (huboDatos && !yaAvisadoDatos) {
        yaAvisadoDatos = true;
        const horaLocal = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
        await sendDiscordAlert(
          `¡Aparecieron datos para la fecha de mañana (${fecha})! Detectado a las ${horaLocal}. Total de lotes: ${totalLotes}, comprobantes en el primer lote: ${cantidadEnLote1} (de los cuales ${cantPreventa} son PREVENTA).`,
          'ADVERTENCIA'
        );
      }
    } catch (error: any) {
      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        logueado = false; // fuerza relogin en el próximo ciclo
      }
      appendLog(`${ahora} | ERROR: ${error.message}`);
    }
  };

  await ciclo();
  setInterval(ciclo, INTERVALO_MIN * 60 * 1000);
}

main().catch((err) => {
  console.error('💥 Error fatal:', err);
  process.exit(1);
});
