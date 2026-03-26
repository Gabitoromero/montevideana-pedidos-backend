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
import { sendDiscordAlert } from '../../shared/utils/discord.js';

// Configuración de timeouts diferenciados
const CHESS_TIMEOUTS = {
  LOGIN: 30000,           // 30 segundos para login
  SINGLE_REQUEST: 15000,  // 15 segundos para requests individuales
  BATCH_REQUEST: 300000   // 5 minutos para operaciones con múltiples lotes
} as const;


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
    
    // if(match[1] < '00286227'){
    //   throw new Error(`PlanillaCarga inválida. Esperado menor a "0000 - 00286227", recibido: "${planillaCarga}"`);
    // }

    return match[1];
  }

  /**
   * Verificar si una venta cumple los criterios base de negocio para ser procesada.
   * Se usa como guardia inline en el loop de filtrado y deduplicación.
   */
  private isVentaValida(venta: ChessVentaRaw): boolean {
    if (venta.idEmpresa !== 1) return false;
    if (venta.dsEmpresa !== 'MONTHELADO S.A.') return false;
    if (venta.anulado !== 'NO') return false;
    if (venta.idDeposito !== 1) return false;
    if (!venta.planillaCarga) return false;
    if (!venta.idFleteroCarga) return false;
    if (venta.dsDocumento === "DEV. PRESUPUESTO 10.5") return false;
    if (venta.dsDocumento === "DEV. PRESUPUESTO 5.2") return false;
    if (venta.dsDocumento === "DEV.PRESUPUESTO 21") return false;
    if (venta.dsDocumento === "DEVOLUCION PRESUPUESTO") return false;
    if (venta.dsDocumento === "DEVOLUCION CONSIGNACION") return false;
    if (venta.dsDocumento === "NOTA DE DEBITO") return false;
    if (venta.dsDocumento === "NOTA DE CREDITO") return false;
    if (venta.dsDocumento === "NOTA DE CREDITO MIPYME") return false;
    if (venta.dsSucursal !== 'CASA CENTRAL ROSARIO') return false;
    return true;
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
      await sendDiscordAlert(errorMsg, 'CRITICO');
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
   *  2. Sincronizar fleteros (crea los nuevos con seguimiento=false)
   *  3. Filtrado y deduplicación en una sola pasada en memoria
   *  4. Precarga de pedidos y fleteros existentes (queries batch)
   *  5. Construcción de entidades nuevas (sin queries individuales)
   *  6. Persistencia en una única transacción batch
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

    // ── Paso 2: Sincronizar fleteros ──
    // Se ejecuta antes del filtrado para que los fleteros nuevos queden en BD
    // (aunque queden con seguimiento=false y no generen pedidos en este sync).
    console.log(`\n📦 Sincronizando fleteros...`);
    const fleteroService = new FleterosService(this.em);

    const uniqueFleteros = new Map<number, string>();
    for (const venta of todasLasVentas) {
      if (venta.idFleteroCarga && venta.dsFleteroCarga) {
        uniqueFleteros.set(venta.idFleteroCarga, venta.dsFleteroCarga);
      }
    }
    console.log(`🚚 Fleteros únicos encontrados: ${uniqueFleteros.size}`);

    const syncFleteros = await fleteroService.syncFromChess(Array.from(uniqueFleteros.entries()));
    result.totalFleterosCreados = syncFleteros.created;
    result.totalFleterosActualizados = syncFleteros.updated;

    // ── Paso 3: Filtrado y deduplicación en una sola pasada ──
    // Precargamos los ids de fleteros activos para hacer lookup O(1) en el loop.
    const fleterosActivos = await fleteroService.findActivos();
    const idsFleterosActivos = new Set(fleterosActivos.map(f => f.idFletero));
    console.log(`✅ Fleteros con seguimiento activo: ${idsFleterosActivos.size}`);

    // ventasUnicas: idPedido → ChessVentaRaw
    // Una sola pasada sobre el dataset: aplica filtro base, seguimiento y deduplicación.
    const ventasUnicas = new Map<string, ChessVentaRaw>();
    let totalDescartadosPorSeguimiento = 0;
    let totalDuplicados = 0;

    for (const venta of todasLasVentas) {
      // Filtro base de validez de la venta
      if (!this.isVentaValida(venta)) continue;

      // Filtro por seguimiento del fletero
      if (!idsFleterosActivos.has(venta.idFleteroCarga!)) {
        totalDescartadosPorSeguimiento++;
        continue;
      }

      // Extraer idPedido — si el formato es inválido, descartar silenciosamente
      let idPedido: string;
      try {
        idPedido = this.extractIdPedido(venta.planillaCarga!);
        // Validación: idPedido debe ser mayor a 00240000
        if (idPedido <= '00240000') {
          continue;
        }
      } catch {
        continue;
      }

      // Deduplicación: quedarse con la versión CON liquidación cuando hay duplicados
      const ventaExistente = ventasUnicas.get(idPedido);
      if (!ventaExistente) {
        ventasUnicas.set(idPedido, venta);
      } else {
        totalDuplicados++;
        const nuevaTieneLiquidacion = this.hasLiquidacionData(venta);
        const existenteTieneLiquidacion = this.hasLiquidacionData(ventaExistente);

        if (nuevaTieneLiquidacion && !existenteTieneLiquidacion) {
          ventasUnicas.set(idPedido, venta);
          console.log(`🔄 Duplicado ${idPedido}: reemplazado por versión CON liquidación`);
        }
      }
    }

    result.totalVentasFiltradas = ventasUnicas.size;
    result.totalPedidosDescartadosPorSeguimiento = totalDescartadosPorSeguimiento;
    result.totalDuplicadosEliminados = totalDuplicados;

    console.log(`🔍 Ventas filtradas (válidas, únicas, con seguimiento): ${ventasUnicas.size}/${todasLasVentas.length}`);
    console.log(`⏭️  Descartados por seguimiento: ${totalDescartadosPorSeguimiento}`);
    console.log(`🗑️  Duplicados eliminados: ${totalDuplicados}`);

    if (ventasUnicas.size === 0) {
      console.log(`\n✅ Subproceso 1 finalizado: sin ventas nuevas para procesar`);
      return;
    }

    // ── Paso 4: Precarga batch —

    // 4a. Determinar qué pedidos ya existen en BD (1 sola query con IN)
    const idsPedidosCandidatos = Array.from(ventasUnicas.keys());
    const pedidosExistentes = await this.em.find(Pedido, { idPedido: { $in: idsPedidosCandidatos } });
    const idsPedidosExistentes = new Set(pedidosExistentes.map(p => p.idPedido));

    // Filtrar solo las ventas que aún no tienen pedido en BD
    const ventasNuevas = idsPedidosCandidatos
      .filter(idPedido => !idsPedidosExistentes.has(idPedido))
      .map(idPedido => ({ idPedido, venta: ventasUnicas.get(idPedido)! }));

    console.log(`🆕 Ventas nuevas a procesar: ${ventasNuevas.length}`);

    if (ventasNuevas.length === 0) {
      console.log(`\n✅ Subproceso 1 finalizado: todos los pedidos ya existen en el sistema`);
      return;
    }

    // 4b. Precargar los fleteros necesarios para las ventas nuevas (1 sola query con IN)
    const idsFleterosCandidatos = [...new Set(ventasNuevas.map(({ venta }) => venta.idFleteroCarga!))];
    const fleterosCargados = await this.em.find(Fletero, { idFletero: { $in: idsFleterosCandidatos } });
    const fleterosMap = new Map(fleterosCargados.map(f => [f.idFletero, f]));

    // ── Paso 5: Construcción de entidades nuevas (sin queries individuales) ──
    console.log(`\n📝 Construyendo pedidos y movimientos...`);

    const entidadesACrear: (Pedido | Movimiento)[] = [];

    for (const { venta, idPedido } of ventasNuevas) {
      const fletero = fleterosMap.get(venta.idFleteroCarga!);

      if (!fletero) {
        const errorMsg = `Fletero ${venta.idFleteroCarga} no encontrado para pedido ${idPedido} — se reintentará en el próximo sync`;
        console.error(`❌ ${errorMsg}`);
        result.errors.push(errorMsg);
        void sendDiscordAlert(errorMsg, 'ADVERTENCIA');
        continue;
      }

      const tieneLiquidacion = this.hasLiquidacionData(venta);
      const fleteroTieneLiquidacionManual = fletero.liquidacion;

      // Determinar si se debe crear movimiento a TESORERÍA:
      // - Fletero con liquidación automática (liquidacion=false): SIEMPRE crear TESORERÍA
      // - Fletero con liquidación manual (liquidacion=true) + venta CON liquidación: crear TESORERÍA
      // - Fletero con liquidación manual (liquidacion=true) + venta SIN liquidación: solo PENDIENTE
      const debeCrearTesoreria = !fleteroTieneLiquidacionManual || tieneLiquidacion;

      const nuevoPedido = this.em.create(Pedido, {
        fechaHora: new Date(),
        idPedido,
        fletero,
        cobrado: debeCrearTesoreria,
      });

      const movimientoPendiente = this.em.create(Movimiento, {
        fechaHora: new Date(),
        estadoInicial: estadoChess,
        estadoFinal: estadoPendiente,
        usuario: usuarioSistema,
        pedido: nuevoPedido,
      });

      entidadesACrear.push(nuevoPedido, movimientoPendiente);
      result.totalMovimientosCreados++;
      result.totalPedidosCreados++;

      if (debeCrearTesoreria) {
        const movimientoTesoreria = this.em.create(Movimiento, {
          fechaHora: new Date(),
          estadoInicial: estadoPendiente,
          estadoFinal: estadoTesoreria,
          usuario: usuarioSistema,
          pedido: nuevoPedido,
        });

        entidadesACrear.push(movimientoTesoreria);
        result.totalMovimientosCreados++;
        result.totalMovimientosTesoreriaCreados++;

        const motivo = !fleteroTieneLiquidacionManual
          ? 'liquidación automática (fletero.liquidacion=false)'
          : 'venta con liquidación (fletero.liquidacion=true)';
        console.log(`✅ Pedido ${idPedido} → TESORERÍA (${motivo})`);
      } else {
        console.log(`⏳ Pedido ${idPedido} → PENDIENTE (sin liquidación, fletero con liquidación manual)`);
      }
    }

    // ── Paso 6: Persistencia en una única transacción batch ──
    if (entidadesACrear.length > 0) {
      try {
        await this.em.persist(entidadesACrear).flush();
        console.log(`💾 Commit batch: ${result.totalPedidosCreados} pedidos, ${result.totalMovimientosCreados} movimientos`);
      } catch (error: any) {
        const errorMsg = `Error en flush batch del subproceso 1: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        result.errors.push(errorMsg);
        await sendDiscordAlert(errorMsg, 'CRITICO');
        throw error;
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
            idPedido = this.extractIdPedido(venta.planillaCarga!);
            if (idPedido <= '00240000') {
              continue;
            }
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
              await sendDiscordAlert(errorMsg, 'CRITICO');
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
            await sendDiscordAlert(errorMsg, 'CRITICO');
          }
        }
      } catch (error: any) {
        const errorMsg = `Error consultando CHESS para fecha ${fechaStr}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        result.errors.push(errorMsg);
        await sendDiscordAlert(errorMsg, 'ADVERTENCIA');
      }
    }

    result.totalPendientesLiquidacionRestantes = result.totalPendientesLiquidacion - result.totalPendientesLiquidacionProcesados;
    console.log(`\n✅ Subproceso 2 finalizado: ${result.totalPendientesLiquidacionProcesados} pendientes procesados, ${result.totalPendientesLiquidacionRestantes} restantes`);
  }
}
