import { AppError } from '../../shared/errors/AppError.js';
import axios, { AxiosInstance } from 'axios';
import { ChessVentaRaw, ChessAPIResponse, ChessSyncResult } from './chess.interfaces.js';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import { EntityManager } from '@mikro-orm/core';
import { Pedido } from '../pedidos/pedido.entity.js';
import { Movimiento } from '../movimientos/movimiento.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { TipoEstado } from '../estados/tipoEstado.entity.js';
import { FleterosService } from '../fleteros/fletero.service.js';
import { Fletero } from '../fleteros/fletero.entity.js';
import { ESTADO_IDS, ESTADO_NOMBRES } from '../../shared/constants/estados.js';

// Configuración de timeouts diferenciados
const CHESS_TIMEOUTS = {
  LOGIN: 30000,           // 30 segundos para login
  SINGLE_REQUEST: 15000,  // 15 segundos para requests individuales
  BATCH_REQUEST: 300000   // 5 minutos para operaciones con múltiples lotes
} as const;

const DISCORD_USER_ID = '368473961190916113';

// Niveles de severidad para alertas de Discord
type DiscordAlertSeverity = 'CRITICO' | 'ADVERTENCIA';

export class ChessService {
  private api: AxiosInstance;
  private jar: CookieJar;
  private em: EntityManager;

  constructor(em: EntityManager) {
    this.em = em;
    const baseURL = process.env.CHESS_API_URL;
    
    if (!baseURL) {
      throw new AppError('CHESS_API_URL es requerida en producción');
    }

    // 1. Crear CookieJar
    this.jar = new CookieJar(undefined, {
      rejectPublicSuffixes: false,
      looseMode: true
    });
    
    // 2. Crear instancia de axios envuelta con wrapper para cookiejar
    this.api = wrapper(
      axios.create({
        baseURL: baseURL,
        timeout: CHESS_TIMEOUTS.SINGLE_REQUEST,
        jar: this.jar,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json', 
          'Accept-Encoding': 'gzip, deflate, br', 
          'Connection': 'keep-alive',
        },
      })
    );
  }

  // ============================================================
  //  INFRAESTRUCTURA DE CONEXIÓN CON CHESS
  // ============================================================

  /**
   * Enviar una alerta a Discord desde el servicio de sincronización.
   * - CRITICO (rojo): errores graves que requieren atención inmediata.
   * - ADVERTENCIA (amarillo): situaciones anómalas pero no bloqueantes.
   */
  private async sendDiscordAlert(mensaje: string, severidad: DiscordAlertSeverity): Promise<void> {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.warn('⚠️ DISCORD_WEBHOOK_URL no configurado, no se pudo enviar alerta');
      return;
    }

    const esCritico = severidad === 'CRITICO';
    const color = esCritico ? 15158332 : 16776960; // rojo : amarillo
    const emoji = esCritico ? '🚨' : '⚠️';
    const titulo = esCritico 
      ? `${emoji} ERROR CRÍTICO en Sincronización CHESS` 
      : `${emoji} Advertencia en Sincronización CHESS`;

    try {
      const body = {
        content: esCritico ? `<@${DISCORD_USER_ID}>` : undefined,
        username: 'Montevideana Sync',
        avatar_url: 'https://cdn-icons-png.flaticon.com/512/2099/2099190.png',
        embeds: [{
          title: titulo,
          description: `\`\`\`${mensaje.substring(0, 1500)}\`\`\``,
          color,
          fields: [
            {
              name: '📅 Fecha y Hora',
              value: new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }),
              inline: true,
            },
            {
              name: '🏷️ Severidad',
              value: severidad,
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'Sistema de Pedidos Montevideana' },
        }],
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        console.error(`❌ Discord respondió con status ${response.status}`);
      }
    } catch (fetchError: any) {
      console.error(`❌ No se pudo enviar alerta a Discord: ${fetchError.message}`);
    }
  }

  public async testConnection(): Promise<{ 
    success: boolean; 
    cookiesCount: number;
    message: string;
  }> {
    await this.login();
    const cookies = await this.jar.getCookies(this.api.defaults.baseURL!);

    const jsessionCookie = cookies.find(c => c.key === 'JSESSIONID');
    if (jsessionCookie) {
      console.log('🔐 Detalles de JSESSIONID:');
      console.log('  - Valor:', jsessionCookie.value.substring(0, 30) + '...');
      console.log('  - Path:', jsessionCookie.path);
      console.log('  - Domain:', jsessionCookie.domain);
      console.log('  - HttpOnly:', jsessionCookie.httpOnly);
      console.log('  - Expira:', jsessionCookie.expires || 'Sesión (no expira)');
    } else {
      console.log('⚠️ No se encontró JSESSIONID');
    }
    
    return {
      success: true,
      cookiesCount: cookies.length,
      message: `Conexión exitosa con CHESS. ${cookies.length} cookie(s) almacenada(s).`
    };
  }

  public async login(): Promise<void> {
    const usuario = process.env.CHESS_USER;
    const password = process.env.CHESS_PASSWORD;
    const isDev = process.env.NODE_ENV !== 'production';

    if (!usuario || !password) {
      throw new AppError('Credenciales de CHESS no configuradas en el backend', 500);
    }

    try {
      if (isDev) {
        console.log(`🔄 Conectando a CHESS en: ${this.api.defaults.baseURL}...`);
        console.log(`👤 Usuario: ${usuario}`);
      } else {
        console.log('🔄 Autenticando con CHESS...');
      }
      
      const response = await this.api.post('web/api/chess/v1/auth/login', {
        usuario,
        password,
      }, {
        timeout: CHESS_TIMEOUTS.LOGIN
      });

      console.log('✅ Login CHESS exitoso.');
      if (isDev) {
        console.log('📦 Response data:', response.data);
      }
      
      // Extraer sessionId del body de la respuesta
      const sessionId = response.data?.sessionId;
      
      if (!sessionId) {
        throw new AppError('CHESS no devolvió sessionId en la respuesta', 500);
      }

      if (isDev) {
        console.log(`🔐 SessionId recibido: ${sessionId.substring(0, 40)}...`);
      } else {
        console.log('🔐 Sesión CHESS establecida');
      }
      
      // Guardar manualmente en CookieJar
      const sessionValue = sessionId.replace('JSESSIONID=', '');
      const hostname = new URL(this.api.defaults.baseURL!).hostname;
      const cookieString = `JSESSIONID=${sessionValue}; Path=/; Domain=${hostname}`;
      
      await this.jar.setCookie(
        cookieString, 
        this.api.defaults.baseURL!,
        {
          loose: true,
          ignoreError: false
        }
      );
      
      // Verificar que se guardó
      const cookies = await this.jar.getCookies(this.api.defaults.baseURL!);
      if (isDev) {
        console.log(`🍪 Cookies guardadas: ${cookies.length}`);
        const savedCookie = cookies.find(c => c.key === 'JSESSIONID');
        if (savedCookie) {
          console.log(`🔐 JSESSIONID en jar: ${savedCookie.value.substring(0, 40)}...`);
        } else {
          console.warn('⚠️ No se pudo guardar JSESSIONID en el jar');
        }
      }

    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.message;
        const url = error.config?.url;
        
        console.error('❌ Error en CHESS:');
        console.error('  URL completa:', `${this.api.defaults.baseURL}/${url}`);
        console.error('  Status:', status);
        console.error('  Message:', message);
        console.error('  Response data:', error.response?.data);
        
        if (status === 401) {
          throw new AppError('Usuario o contraseña de CHESS incorrectos', 401);
        }
        if (status === 404) {
          throw new AppError('La URL de login de CHESS es incorrecta', 502);
        }
        if (error.code === 'ECONNREFUSED') {
          throw new AppError('El servidor CHESS rechazó la conexión. Verifica que esté activo.', 502);
        }
        if (error.code === 'ETIMEDOUT') {
          throw new AppError('Timeout al conectar con CHESS. El servidor no responde.', 504);
        }
      }
      
      console.error('❌ Error desconocido:', error);
      throw new AppError(`No se pudo conectar con el ERP: ${error.message || 'Error desconocido'}`, 502);
    }
  }

  private async requestWithAuth<T>(requestFn: () => Promise<T>): Promise<T> {
    const isDev = process.env.NODE_ENV !== 'production';
    
    // Verificar si hay cookies activas
    const cookies = await this.jar.getCookies(this.api.defaults.baseURL!);
    if (cookies.length === 0) {
      console.log('🔐 No hay cookies. Haciendo login...');
      await this.login();
    }

    try {
      if (isDev) {
        const currentCookies = await this.jar.getCookies(this.api.defaults.baseURL!);
        const jsession = currentCookies.find(c => c.key === 'JSESSIONID');
        console.log(`🔐 Intento 1 con JSESSIONID: ${jsession?.value.substring(0, 30)}...`);
      }
    
      return await requestFn();
    } catch (error: any) {

      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        console.warn('⚠️ Sesión CHESS caducada. Renovando credenciales...');
        await this.jar.removeAllCookies();
        await this.login();
        
        if (isDev) {
          const newCookies = await this.jar.getCookies(this.api.defaults.baseURL!);
          const newJsession = newCookies.find(c => c.key === 'JSESSIONID');
          console.log(`🔐 Intento 2 con JSESSIONID: ${newJsession?.value.substring(0, 30)}...`);
        }
        
        // Esperar un poquito para asegurar que el servidor procesó el login
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return await requestFn();
      }
      
      throw error;
    }
  }

  // ============================================================
  //  CONSULTA DE VENTAS A CHESS
  // ============================================================

  /**
   * Obtener ventas de CHESS para un rango de fecha (endpoint de debug).
   * NO se usa en la sincronización principal.
   */
  public async getVentasDelDia(
    fechaDesde: string,
    fechaHasta?: string,
    options?: {
      empresas?: string;
      detallado?: boolean;
      nroLote?: number;
    }
  ): Promise<ChessVentaRaw[]> {
    return this.requestWithAuth(async () => {
      const fechaFinal = fechaHasta || fechaDesde;
      
      const config = {
        params: {
          fechaDesde: fechaDesde,
          fechaHasta: fechaFinal,
          empresas: options?.empresas,
          detallado: options?.detallado ?? true,
          nroLote: options?.nroLote ?? 0
        }
      };

      console.log(`📡 Consultando ventas CHESS:`, config.params);
      
      try {
        const response = await this.api.get('web/api/chess/v1/ventas/', config);

        console.log(`✅ Ventas obtenidas: ${Array.isArray(response.data) ? response.data.length : 'Objeto recibido'}`);
        
        const data = response.data;
        return Array.isArray(data) ? data : (data.data || []);
        
      } catch (error: any) {
        if (axios.isAxiosError(error) && error.response?.status === 500) {
          console.error('❌ Error 500 de CHESS:');
          console.error('  Response data:', JSON.stringify(error.response.data, null, 2));
          console.error('  Params enviados:', config.params);
        }
        throw error;
      }
    });
  }

  /**
   * Parsear el string de lotes para obtener el total.
   * Ejemplo: "Numero de lote obtenido: 1/21. Cantidad de comprobantes totales: 20989"
   */
  private parseTotalLotes(cantComprobantesVentas: string): number {
    const match = cantComprobantesVentas.match(/(\d+)\/(\d+)/);
    if (match) {
      return parseInt(match[2]); // Retorna el segundo número (total de lotes)
    }
    return 1; // Si no se puede parsear, asumir 1 lote
  }

  /**
   * Obtener TODAS las ventas de una fecha iterando por todos los lotes de CHESS.
   * Es la función central de comunicación con CHESS para obtención de ventas.
   */
  public async getAllVentasDelDia(fecha: string): Promise<{ ventas: ChessVentaRaw[]; lotesProcesados: number }> {
    return this.requestWithAuth(async () => {
      const todasLasVentas: ChessVentaRaw[] = [];
      let loteActual = 1;
      let totalLotes = 1;

      do {
        console.log(`📦 Obteniendo lote ${loteActual}/${totalLotes}...`);

        const config = {
          params: {
            fechaDesde: fecha,
            fechaHasta: fecha,
            empresas: '1',
            detallado: true,
            nroLote: loteActual,
          },
        };

        const response = await this.api.get<ChessAPIResponse>('web/api/chess/v1/ventas/', {
          ...config,
          timeout: CHESS_TIMEOUTS.BATCH_REQUEST
        });
        
        // Parsear total de lotes de la primera respuesta
        if (loteActual === 1) {
          totalLotes = this.parseTotalLotes(response.data.cantComprobantesVentas);
          console.log(`📊 Total de lotes a procesar: ${totalLotes}`);
        }

        // Extraer ventas del lote actual
        const ventasLote = response.data.dsReporteComprobantesApi?.VentasResumen || [];
        todasLasVentas.push(...ventasLote);
        console.log(`✅ Lote ${loteActual}: ${ventasLote.length} ventas obtenidas`);

        loteActual++;
      } while (loteActual <= totalLotes);

      const lotesProcesados = totalLotes;
      console.log(`🎯 Total de ventas obtenidas: ${todasLasVentas.length}`);
      console.log(`📦 Lotes procesados: ${lotesProcesados}`);
      
      return { ventas: todasLasVentas, lotesProcesados };
    });
  }

  // ============================================================
  //  UTILIDADES
  // ============================================================

  /**
   * Extraer los últimos 8 dígitos del formato de planillaCarga de CHESS.
   * Formato esperado: "XXXX - XXXXXXXX" (ej: "0000 - 00226957")
   * Retorna: "XXXXXXXX" (ej: "00226957")
   */
  private extractIdPedido(planillaCarga: string): string {
    const match = planillaCarga.match(/^\d{4} - (\d{8})$/);
    
    if (!match) {
      throw new Error(`Formato inválido de planillaCarga. Esperado: "XXXX - XXXXXXXX", recibido: "${planillaCarga}"`);
    }
    
    if(match[1] < '00286227'){
      throw new Error(`PlanillaCarga inválida. Esperado menor a "0000 - 00286227", recibido: "${planillaCarga}"`);
    }

    return match[1];
  }

  /**
   * Filtrar ventas válidas según los criterios base de negocio.
   */
  private filterValidSales(ventas: ChessVentaRaw[]): ChessVentaRaw[] {
    return ventas.filter((venta) => {
      if (venta.idEmpresa !== 1) return false;
      if (venta.dsEmpresa !== 'MONTHELADO S.A.') return false;
      if (venta.anulado !== 'NO') return false;
      if (venta.idDeposito !== 1) return false;
      if (venta.planillaCarga === "") return false;
      if (venta.idFleteroCarga === 0) return false;
      if (venta.dsSucursal !== 'CASA CENTRAL ROSARIO') return false;
      return true;
    });
  }

  /**
   * Verificar si una venta tiene datos de liquidación válidos.
   */
  private hasLiquidacionData(venta: ChessVentaRaw): boolean {
    return venta.idLiquidacion !== 0 && venta.fechaLiquidacion !== null;
  }

  /**
   * Convertir una fecha Date a string en formato "YYYY/MM/DD" para la API de CHESS.
   */
  private formatFechaParaChess(fecha: Date): string {
    return fecha.toISOString().split('T')[0].replace(/-/g, '/');
  }

  // ============================================================
  //  PROCESO PRINCIPAL DE SINCRONIZACIÓN
  // ============================================================

  /**
   * Proceso principal de sincronización con CHESS.
   * Ejecuta secuencialmente los 2 subprocesos:
   *   1. Detección de nuevos pedidos (ventas del día de hoy)
   *   2. Seguimiento de pendientes de liquidación
   */
  public async syncConChess(): Promise<ChessSyncResult> {
    const startTime = new Date();
    console.log(`\n🚀 ========== INICIO SINCRONIZACIÓN CHESS ==========`);
    console.log(`⏰ Hora de inicio: ${startTime.toLocaleString('es-AR')}`);

    const result: ChessSyncResult = {
      success: false,
      timestamp: startTime.toISOString(),
      // Subproceso 1
      totalVentasObtenidas: 0,
      totalVentasFiltradas: 0,
      totalFleterosCreados: 0,
      totalFleterosActualizados: 0,
      totalPedidosDescartadosPorSeguimiento: 0,
      totalDuplicadosEliminados: 0,
      totalPedidosCreados: 0,
      totalMovimientosCreados: 0,
      totalMovimientosTesoreriaCreados: 0,
      lotesProcesados: 0,
      // Subproceso 2
      totalPendientesLiquidacion: 0,
      totalPendientesLiquidacionProcesados: 0,
      totalPendientesLiquidacionRestantes: 0,
      totalFechasConsultadas: 0,
      errors: [],
    };

    try {
      // Validar entidades necesarias para ambos subprocesos
      const usuarioSistema = await this.em.findOne(Usuario, { id: 1 });
      if (!usuarioSistema) {
        throw new AppError('Usuario "Sistema" (ID: 1) no existe en la base de datos', 500);
      }

      const estadoChess = await this.em.findOne(TipoEstado, { id: ESTADO_IDS.CHESS });
      if (!estadoChess) {
        throw new AppError(`TipoEstado "${ESTADO_NOMBRES.CHESS}" (ID: ${ESTADO_IDS.CHESS}) no existe en la base de datos`, 500);
      }

      const estadoPendiente = await this.em.findOne(TipoEstado, { id: ESTADO_IDS.PENDIENTE });
      if (!estadoPendiente) {
        throw new AppError(`TipoEstado "${ESTADO_NOMBRES.PENDIENTE}" (ID: ${ESTADO_IDS.PENDIENTE}) no existe en la base de datos`, 500);
      }

      const estadoTesoreria = await this.em.findOne(TipoEstado, { id: ESTADO_IDS.TESORERIA });
      if (!estadoTesoreria) {
        throw new AppError(`TipoEstado "TESORERIA" (ID: ${ESTADO_IDS.TESORERIA}) no existe en la base de datos`, 500);
      }

      console.log(`✅ Validaciones iniciales completadas`);

      // ────────────────────────────────────────────
      // SUBPROCESO 1: Detección de nuevos pedidos
      // ────────────────────────────────────────────
      console.log(`\n📋 ========== SUBPROCESO 1: DETECCIÓN DE NUEVOS PEDIDOS ==========`);
      await this.detectarNuevosPedidos(
        result,
        usuarioSistema,
        estadoChess,
        estadoPendiente,
        estadoTesoreria
      );

      // ────────────────────────────────────────────
      // SUBPROCESO 2: Seguimiento de pendientes
      // ────────────────────────────────────────────
      console.log(`\n📋 ========== SUBPROCESO 2: SEGUIMIENTO DE PENDIENTES ==========`);
      await this.seguimientoPendientes(
        result,
        usuarioSistema,
        estadoTesoreria
      );

      result.success = true;
    } catch (error: any) {
      result.success = false;
      const errorMsg = `Error general en sincronización: ${error.message}`;
      result.errors.push(errorMsg);
      console.error(`\n❌ ${errorMsg}`);
      console.error(error);
      await this.sendDiscordAlert(errorMsg, 'CRITICO');
    }

    // Resumen final
    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;

    console.log(`\n📊 ========== RESUMEN DE SINCRONIZACIÓN ==========`);
    console.log(`${result.success ? '✅' : '❌'} Sincronización ${result.success ? 'completada exitosamente' : 'con errores'}`);
    console.log(`⏱️  Duración: ${duration.toFixed(2)} segundos`);
    console.log(`--- Subproceso 1: Detección de nuevos pedidos ---`);
    console.log(`📦 Lotes procesados: ${result.lotesProcesados}`);
    console.log(`📦 Ventas obtenidas de CHESS: ${result.totalVentasObtenidas}`);
    console.log(`🔍 Ventas filtradas (válidas): ${result.totalVentasFiltradas}`);
    console.log(`🚚 Fleteros creados: ${result.totalFleterosCreados}`);
    console.log(`📝 Fleteros actualizados: ${result.totalFleterosActualizados}`);
    console.log(`⏭️  Descartados por seguimiento: ${result.totalPedidosDescartadosPorSeguimiento}`);
    console.log(`🗑️  Duplicados eliminados: ${result.totalDuplicadosEliminados}`);
    console.log(`🆕 Pedidos creados: ${result.totalPedidosCreados}`);
    console.log(`📝 Movimientos creados: ${result.totalMovimientosCreados}`);
    console.log(`💵 Movimientos a TESORERIA: ${result.totalMovimientosTesoreriaCreados}`);
    console.log(`--- Subproceso 2: Seguimiento de pendientes ---`);
    console.log(`📋 Pendientes de liquidación: ${result.totalPendientesLiquidacion}`);
    console.log(`📅 Fechas consultadas: ${result.totalFechasConsultadas}`);
    console.log(`✅ Pendientes procesados: ${result.totalPendientesLiquidacionProcesados}`);
    console.log(`⏳ Pendientes restantes: ${result.totalPendientesLiquidacionRestantes}`);
    if (result.errors.length > 0) {
      console.log(`⚠️  Errores: ${result.errors.length}`);
      result.errors.forEach((err) => console.log(`   - ${err}`));
    }
    console.log(`================================================\n`);

    return result;
  }

  // ============================================================
  //  SUBPROCESO 1: DETECCIÓN DE NUEVOS PEDIDOS
  // ============================================================

  /**
   * Subproceso 1: Obtiene las ventas del día de hoy desde CHESS,
   * filtra las ventas nuevas (que no existen en el sistema), y crea
   * los pedidos con sus movimientos correspondientes.
   *
   * Pasos:
   *  1. Obtención de ventas del día (todos los lotes)
   *  2. Filtro (ventas válidas, fleteros con seguimiento, deduplicación, ventas nuevas)
   *  3. Creación de pedidos y movimientos según tipo de liquidación del fletero
   */
  private async detectarNuevosPedidos(
    result: ChessSyncResult,
    usuarioSistema: Usuario,
    estadoChess: TipoEstado,
    estadoPendiente: TipoEstado,
    estadoTesoreria: TipoEstado
  ): Promise<void> {

    // ── Paso 1: Obtención de ventas ──
    const fechaHoy = this.formatFechaParaChess(new Date());
    console.log(`📅 Fecha de consulta: ${fechaHoy}`);

    const { ventas: todasLasVentas, lotesProcesados } = await this.getAllVentasDelDia(fechaHoy);
    result.totalVentasObtenidas = todasLasVentas.length;
    result.lotesProcesados = lotesProcesados;

    // ── Paso 2: Filtro ──

    // 2a. Filtro base de ventas válidas
    const ventasFiltradas = this.filterValidSales(todasLasVentas);
    result.totalVentasFiltradas = ventasFiltradas.length;
    console.log(`🔍 Ventas filtradas (válidas): ${ventasFiltradas.length}/${todasLasVentas.length}`);

    // 2b. Sincronizar fleteros (nuevos se crean con seguimiento=false, liquidacion=false)
    console.log(`\n📦 Sincronizando fleteros...`);
    const fleteroService = new FleterosService(this.em);
    
    const uniqueFleteros = new Map<number, string>();
    ventasFiltradas.forEach(venta => {
      if (venta.idFleteroCarga && venta.dsFleteroCarga) {
        uniqueFleteros.set(venta.idFleteroCarga, venta.dsFleteroCarga);
      }
    });
    console.log(`🚚 Fleteros únicos encontrados: ${uniqueFleteros.size}`);
    
    const syncFleteros = await fleteroService.syncFromChess(Array.from(uniqueFleteros.entries()));
    result.totalFleterosCreados = syncFleteros.created;
    result.totalFleterosActualizados = syncFleteros.updated;

    // 2c. Filtrar por fleteros con seguimiento activo
    const fleterosActivos = await fleteroService.findActivos();
    const idsFleterosActivos = new Set(fleterosActivos.map(f => f.idFletero));
    console.log(`✅ Fleteros con seguimiento activo: ${idsFleterosActivos.size}`);
    
    const ventasConSeguimiento = ventasFiltradas.filter(venta => 
      venta.idFleteroCarga && idsFleterosActivos.has(venta.idFleteroCarga)
    );
    
    result.totalPedidosDescartadosPorSeguimiento = ventasFiltradas.length - ventasConSeguimiento.length;
    console.log(`📊 Ventas con seguimiento: ${ventasConSeguimiento.length}/${ventasFiltradas.length}`);

    // 2d. Deduplicar por planillaCarga, PREFIRIENDO la versión con liquidación
    console.log(`\n🔄 Eliminando duplicados (prefiriendo versiones con liquidación)...`);
    const ventasUnicas = new Map<string, ChessVentaRaw>();
    let duplicadosEliminados = 0;
    
    for (const venta of ventasConSeguimiento) {
      try {
        if (!venta.planillaCarga) continue;
        const idPedido = this.extractIdPedido(venta.planillaCarga);
        
        const ventaExistente = ventasUnicas.get(idPedido);
        if (!ventaExistente) {
          // Primera vez que vemos esta planillaCarga
          ventasUnicas.set(idPedido, venta);
        } else {
          // Duplicado detectado: preferir la versión CON liquidación
          duplicadosEliminados++;
          const nuevaTieneLiquidacion = this.hasLiquidacionData(venta);
          const existenteTieneLiquidacion = this.hasLiquidacionData(ventaExistente);

          if (nuevaTieneLiquidacion && !existenteTieneLiquidacion) {
            // La nueva tiene liquidación y la existente no → reemplazar
            ventasUnicas.set(idPedido, venta);
            console.log(`🔄 Duplicado ${idPedido}: reemplazado por versión CON liquidación`);
          }
        }
      } catch (error) {
        // Ignorar ventas con formato inválido de planillaCarga
        continue;
      }
    }
    
    const ventasSinDuplicados = Array.from(ventasUnicas.values());
    result.totalDuplicadosEliminados = duplicadosEliminados;
    console.log(`✅ Ventas únicas: ${ventasSinDuplicados.length}`);
    console.log(`🗑️  Duplicados eliminados: ${duplicadosEliminados}`);

    // 2e. Filtrar solo ventas nuevas (que no existen como pedidos en el sistema)
    const ventasNuevas: Array<{ venta: ChessVentaRaw; idPedido: string }> = [];

    for (const venta of ventasSinDuplicados) {
      try {
        const idPedido = this.extractIdPedido(venta.planillaCarga!);
        const pedidoExistente = await this.em.findOne(Pedido, { idPedido });
        
        if (!pedidoExistente) {
          ventasNuevas.push({ venta, idPedido });
        }
      } catch (error) {
        continue;
      }
    }

    console.log(`🆕 Ventas nuevas a procesar: ${ventasNuevas.length}`);

    // ── Paso 3: Creación de pedidos y movimientos ──
    console.log(`\n📝 Creando pedidos y movimientos...`);

    for (const { venta, idPedido } of ventasNuevas) {
      try {
        const fletero = await this.em.findOne(Fletero, { idFletero: venta.idFleteroCarga! });
        if (!fletero) {
          const advertencia = `Fletero ${venta.idFleteroCarga} no encontrado para pedido ${idPedido}`;
          console.error(`❌ ${advertencia}`);
          await this.sendDiscordAlert(advertencia, 'ADVERTENCIA');
          continue;
        }

        const tieneLiquidacion = this.hasLiquidacionData(venta);
        const fleteroTieneLiquidacionManual = fletero.liquidacion;

        // Determinar si se debe crear movimiento a TESORERÍA:
        // - Fletero con liquidación automática (liquidacion=false): SIEMPRE crear TESORERÍA
        // - Fletero con liquidación manual (liquidacion=true) + venta CON liquidación: crear TESORERÍA
        // - Fletero con liquidación manual (liquidacion=true) + venta SIN liquidación: solo PENDIENTE
        const debeCrearTesoreria = !fleteroTieneLiquidacionManual || tieneLiquidacion;

        await this.em.transactional(async (transactionalEm) => {
          // Crear el pedido
          const nuevoPedido = transactionalEm.create(Pedido, {
            fechaHora: new Date(),
            idPedido: idPedido,
            fletero: fletero,
            cobrado: debeCrearTesoreria,
          });

          // Crear movimiento CHESS → PENDIENTE
          const movimientoPendiente = transactionalEm.create(Movimiento, {
            fechaHora: new Date(),
            estadoInicial: estadoChess,
            estadoFinal: estadoPendiente,
            usuario: usuarioSistema,
            pedido: nuevoPedido,
          });

          result.totalMovimientosCreados++;

          if (debeCrearTesoreria) {
            // Esperar 1 segundo para evitar colisión de PK en MySQL (fechaHora se redondea a segundos)
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Crear movimiento PENDIENTE → TESORERÍA
            const movimientoTesoreria = transactionalEm.create(Movimiento, {
              fechaHora: new Date(),
              estadoInicial: estadoPendiente,
              estadoFinal: estadoTesoreria,
              usuario: usuarioSistema,
              pedido: nuevoPedido,
            });

            result.totalMovimientosTesoreriaCreados++;
            result.totalMovimientosCreados++;

            await transactionalEm.persist([nuevoPedido, movimientoPendiente, movimientoTesoreria]).flush();

            const motivo = !fleteroTieneLiquidacionManual 
              ? 'liquidación automática (fletero.liquidacion=false)' 
              : 'venta con liquidación (fletero.liquidacion=true)';
            console.log(`✅ Pedido ${idPedido} creado con TESORERÍA — ${motivo}`);
          } else {
            // Solo PENDIENTE: el pedido queda pendiente de liquidación
            await transactionalEm.persist([nuevoPedido, movimientoPendiente]).flush();
            console.log(`⏳ Pedido ${idPedido} creado como PENDIENTE (sin liquidación, fletero con liquidación manual)`);
          }
        });

        result.totalPedidosCreados++;
      } catch (error: any) {
        const errorMsg = `Error creando pedido ${idPedido}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        result.errors.push(errorMsg);
        await this.sendDiscordAlert(errorMsg, 'CRITICO');
      }
    }

    console.log(`\n✅ Subproceso 1 finalizado: ${result.totalPedidosCreados} pedidos creados`);
  }

  // ============================================================
  //  SUBPROCESO 2: SEGUIMIENTO DE PENDIENTES DE LIQUIDACIÓN
  // ============================================================

  /**
   * Subproceso 2: Revisa los pedidos pendientes de liquidación (cobrado=false
   * de fleteros con liquidacion=true y seguimiento=true), consulta a CHESS
   * las ventas de las fechas correspondientes, y cuando detecta que CHESS
   * envió datos con liquidación, crea el movimiento a TESORERÍA.
   *
   * Pasos:
   *  1. Obtener la lista de pedidos pendientes de liquidación
   *  2. Agrupar las fechas únicas de creación de esos pedidos
   *  3. Consultar a CHESS por cada fecha y detectar ventas con liquidación
   *  4. Crear movimientos a TESORERÍA para los pedidos liquidados
   */
  private async seguimientoPendientes(
    result: ChessSyncResult,
    usuarioSistema: Usuario,
    estadoTesoreria: TipoEstado
  ): Promise<void> {

    // ── Paso 1: Obtener pedidos pendientes de liquidación ──
    const pedidosPendientes = await this.em.find(
      Pedido,
      {
        cobrado: false,
        fletero: {
          liquidacion: true,
          seguimiento: true,
        },
      },
      {
        populate: ['fletero', 'movimientos', 'movimientos.estadoFinal'],
        orderBy: { fechaHora: 'ASC' },
      }
    );

    result.totalPendientesLiquidacion = pedidosPendientes.length;

    if (pedidosPendientes.length === 0) {
      console.log(`✅ No hay pedidos pendientes de liquidación`);
      result.totalPendientesLiquidacionRestantes = 0;
      return;
    }

    console.log(`📋 Pedidos pendientes de liquidación: ${pedidosPendientes.length}`);

    // ── Paso 2: Agrupar por fechas únicas ──
    // Crear un Map <fechaStr, Pedido[]> para agrupar pedidos por su fecha de creación
    const pedidosPorFecha = new Map<string, Pedido[]>();

    for (const pedido of pedidosPendientes) {
      const fechaStr = this.formatFechaParaChess(pedido.fechaHora);
      
      const pedidosDeEstaFecha = pedidosPorFecha.get(fechaStr);
      if (pedidosDeEstaFecha) {
        pedidosDeEstaFecha.push(pedido);
      } else {
        pedidosPorFecha.set(fechaStr, [pedido]);
      }
    }

    console.log(`📅 Fechas únicas a consultar: ${pedidosPorFecha.size}`);
    result.totalFechasConsultadas = pedidosPorFecha.size;

    // Mantener un set de idPedidos que ya fueron procesados para no re-procesarlos
    const pedidosYaProcesados = new Set<string>();

    // ── Paso 3: Consultar CHESS por cada fecha ──
    for (const [fechaStr, pedidosDeLaFecha] of pedidosPorFecha) {
      try {
        console.log(`\n📅 Consultando CHESS para fecha: ${fechaStr} (${pedidosDeLaFecha.length} pedidos pendientes)`);
        
        const { ventas } = await this.getAllVentasDelDia(fechaStr);
        
        // Buscar ventas con liquidación que coincidan con pedidos pendientes
        for (const venta of ventas) {
          if (!venta.planillaCarga) continue;
          if (!this.hasLiquidacionData(venta)) continue;

          let idPedido: string;
          try {
            idPedido = this.extractIdPedido(venta.planillaCarga);
          } catch {
            continue;
          }

          // ¿Ya fue procesado en una iteración anterior?
          if (pedidosYaProcesados.has(idPedido)) continue;

          // Buscar si este idPedido coincide con algún pedido pendiente de esta fecha
          const pedidoPendiente = pedidosDeLaFecha.find(p => p.idPedido === idPedido);
          if (!pedidoPendiente) continue;

          // ── Paso 4: Crear movimiento a TESORERÍA ──
          try {
            // Obtener el estado actual del pedido (último movimiento)
            const movimientos = pedidoPendiente.movimientos.getItems();
            if (movimientos.length === 0) {
              const errorMsg = `Pedido ${idPedido} no tiene movimientos - dato inconsistente en BD`;
              console.error(`❌ ${errorMsg}`);
              await this.sendDiscordAlert(errorMsg, 'CRITICO');
              continue;
            }

            const ultimoMovimiento = movimientos.reduce((prev, current) =>
              current.fechaHora > prev.fechaHora ? current : prev
            );
            const estadoActual = ultimoMovimiento.estadoFinal;

            await this.em.transactional(async (transactionalEm) => {
              const movimientoTesoreria = transactionalEm.create(Movimiento, {
                fechaHora: new Date(),
                estadoInicial: estadoActual,
                estadoFinal: estadoTesoreria,
                usuario: usuarioSistema,
                pedido: pedidoPendiente,
              });

              pedidoPendiente.cobrado = true;
              
              await transactionalEm.persist(movimientoTesoreria).flush();
            });

            pedidosYaProcesados.add(idPedido);
            result.totalPendientesLiquidacionProcesados++;
            console.log(`✅ Pedido ${idPedido}: liquidación detectada → movimiento a TESORERÍA (desde ${estadoActual.nombreEstado})`);
          } catch (error: any) {
            const errorMsg = `Error procesando liquidación de pedido ${idPedido}: ${error.message}`;
            console.error(`❌ ${errorMsg}`);
            result.errors.push(errorMsg);
            await this.sendDiscordAlert(errorMsg, 'CRITICO');
          }
        }
      } catch (error: any) {
        const errorMsg = `Error consultando CHESS para fecha ${fechaStr}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        result.errors.push(errorMsg);
        await this.sendDiscordAlert(errorMsg, 'ADVERTENCIA');
      }
    }

    result.totalPendientesLiquidacionRestantes = result.totalPendientesLiquidacion - result.totalPendientesLiquidacionProcesados;
    console.log(`\n✅ Subproceso 2 finalizado: ${result.totalPendientesLiquidacionProcesados} pendientes procesados, ${result.totalPendientesLiquidacionRestantes} restantes`);
  }
}
