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

    // ✅ 1. Crear CookieJar
    this.jar = new CookieJar(undefined, {
      rejectPublicSuffixes: false,  // ✅ CLAVE: Permite IPs y sufijos públicos
      looseMode: true  // ✅ Modo permisivo
    });
    
    // ✅ 2. Crear instancia de axios Y envolverla con wrapper
    this.api = wrapper(
      axios.create({
        baseURL: baseURL,
        timeout: CHESS_TIMEOUTS.SINGLE_REQUEST, // Timeout por defecto
        jar: this.jar,  // Ahora funciona porque usamos wrapper
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

  /**
   * Extraer los últimos 8 dígitos del formato de planillaCarga de CHESS
   * Formato esperado: "XXXX - XXXXXXXX" (ej: "0000 - 00226957")
   * Retorna: "XXXXXXXX" (ej: "00226957")
   */
  private extractIdPedido(planillaCarga: string): string {
    // Validar formato esperado: "0000 - 00284505" (4 dígitos - 8 dígitos)
    const match = planillaCarga.match(/^\d{4} - (\d{8})$/);
    
    if (!match) {
      throw new Error(`Formato inválido de planillaCarga. Esperado: "XXXX - XXXXXXXX", recibido: "${planillaCarga}"`);
    }
    
    // Retornar solo los 8 dígitos finales (grupo de captura 1)
    return match[1];
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
    
    // ✅ EXTRAER sessionId del BODY
    const sessionId = response.data?.sessionId;
    const expires = response.data?.expires;
    
    if (!sessionId) {
      throw new AppError('CHESS no devolvió sessionId en la respuesta', 500);
    }

    if (isDev) {
      console.log(`🔐 SessionId recibido: ${sessionId.substring(0, 40)}...`);
    } else {
      console.log('🔐 Sesión CHESS establecida');
    }
    
    // ✅ GUARDAR MANUALMENTE en CookieJar con formato correcto
    // Extraer solo el valor (sin "JSESSIONID=" porque ya está en el sessionId)
    const sessionValue = sessionId.replace('JSESSIONID=', '');
    const hostname = new URL(this.api.defaults.baseURL!).hostname;
    
    // ✅ Opciones para permitir IPs y dominios especiales
    const cookieString = `JSESSIONID=${sessionValue}; Path=/; Domain=${hostname}`;
    
    await this.jar.setCookie(
      cookieString, 
      this.api.defaults.baseURL!,
      {
        loose: true,  // ✅ Permite cookies "sueltas" (no estrictas)
        ignoreError: false  // Queremos saber si hay errores
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
          // Verificar la cookie después del login
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
        throw error;  // Re-lanzar para que requestWithAuth lo maneje
      }
    });
  }

  /**
   * Parsear el string de lotes para obtener el total
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
   * Obtener TODAS las ventas del día iterando por todos los lotes
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
          timeout: 300000 // 5 minutos para operaciones con múltiples lotes
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

  /**
   * Filtrar ventas válidas según los criterios especificados
   */
  private filterValidSales(ventas: ChessVentaRaw[]): ChessVentaRaw[] {
    return ventas.filter((venta) => {
      // 1. idEmpresa = 1
      if (venta.idEmpresa !== 1) {
        return false;
      }

      // 2. dsEmpresa = "MONTHELADO S.A."
      if (venta.dsEmpresa !== 'MONTHELADO S.A.') {
        return false;
      }

      // 3. anulado = "NO"
      if (venta.anulado !== 'NO') {
        return false;
      }

      // 4. Deposito 1
      if(venta.idDeposito !== 1){
        return false;
      }

      // 5. Planilla Carga
      if(venta.planillaCarga === ""){
        return false;
      }

      // 6. idFleteroCarga ≠ 0 (tiene fletero asignado)
      if (venta.idFleteroCarga === 0) {
        return false;
      }

      // 7. dsSucursal = "CASA CENTRAL ROSARIO"
      if (venta.dsSucursal !== 'CASA CENTRAL ROSARIO') {
        return false;
      }

      return true;
    });
  }

  /**
   * Verificar si una venta tiene datos de liquidación válidos
   */
  private hasLiquidacionData(venta: ChessVentaRaw): boolean {
    return venta.idLiquidacion !== undefined && 
           venta.idLiquidacion !== 0 && 
           venta.fechaLiquidacion !== undefined && 
           venta.fechaLiquidacion !== null;
  }

  /**
   * Obtener el estado actual de un pedido (último movimiento)
   */
  private async getCurrentState(pedido: Pedido): Promise<TipoEstado | null> {
    const ultimoMovimiento = await this.em.findOne(
      Movimiento,
      { pedido },
      {
        populate: ['estadoFinal'],
        orderBy: { fechaHora: 'DESC' },
      }
    );

    return ultimoMovimiento?.estadoFinal || null;
  }

  /**
   * Sincronizar ventas de CHESS con el sistema interno
   * @param fechaOverride - Fecha opcional para sincronizar (por defecto: hoy)
   */
  public async syncVentas(fechaOverride?: Date): Promise<ChessSyncResult> {
    const startTime = new Date();
    console.log(`\n🚀 ========== INICIO SINCRONIZACIÓN CHESS ==========`);
    console.log(`⏰ Hora de inicio: ${startTime.toLocaleString('es-AR')}`);

    const result: ChessSyncResult = {
      success: false,
      timestamp: startTime.toISOString(),
      totalVentasObtenidas: 0,
      totalVentasFiltradas: 0,
      totalFleterosCreados: 0,
      totalFleterosActualizados: 0,
      totalPedidosDescartadosPorSeguimiento: 0,
      totalPedidosCreados: 0,
      totalPedidosActualizadosConLiquidacion: 0,
      totalMovimientosCreados: 0,
      totalMovimientosTesoreriaCreados: 0,
      lotesProcesados: 0,
      errors: [],
    };

    try {
      // 1. Validar que existan Usuario "Sistema" y TipoEstados necesarios
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

      // 2. Usar fecha override o fecha actual
      const fechaSync = fechaOverride || new Date();
      const esDiaAnterior = fechaOverride && fechaOverride < new Date(new Date().setHours(0, 0, 0, 0));
      
      if (esDiaAnterior) {
        console.log(`🌅 Sincronizando pedidos del DÍA ANTERIOR`);
      }
      
      const fechaStr = fechaSync.toISOString().split('T')[0].replace(/-/g, '-');
      const fechaStr2 = fechaSync.toISOString().split('T')[0].replace(/-/g, '/');
      console.log(`📅 Fecha de sincronización: ${fechaStr}`);

      // 3. Obtener todas las ventas del día
      const { ventas: todasLasVentas, lotesProcesados } = await this.getAllVentasDelDia(fechaStr2);
      result.totalVentasObtenidas = todasLasVentas.length;
      result.lotesProcesados = lotesProcesados;

      // 4. Filtrar ventas válidas
      const ventasFiltradas = this.filterValidSales(todasLasVentas);
      result.totalVentasFiltradas = ventasFiltradas.length;
      console.log(`🔍 Ventas filtradas (válidas): ${ventasFiltradas.length}/${todasLasVentas.length}`);

      // 5. Sincronizar fleteros desde Chess
      console.log(`\n📦 ========== SINCRONIZANDO FLETEROS ==========`);
      const fleteroService = new FleterosService(this.em);
      
      // Extraer fleteros únicos de las ventas filtradas
      const uniqueFleteros = new Map<number, string>();
      ventasFiltradas.forEach(venta => {
        if (venta.idFleteroCarga && venta.dsFleteroCarga) {
          uniqueFleteros.set(venta.idFleteroCarga, venta.dsFleteroCarga);
        }
      });
      
      console.log(`🚚 Fleteros únicos encontrados: ${uniqueFleteros.size}`);
      
      // Sincronizar fleteros (optimizado con Map)
      const syncResult = await fleteroService.syncFromChess(Array.from(uniqueFleteros.entries()));
      result.totalFleterosCreados = syncResult.created;
      result.totalFleterosActualizados = syncResult.updated;
      
      // 6. Filtrar ventas por fleteros con seguimiento activo
      console.log(`\n🔍 ========== FILTRANDO POR SEGUIMIENTO ==========`);
      const fleterosActivos = await fleteroService.findActivos();
      const idsFleterosActivos = new Set(fleterosActivos.map(f => f.idFletero));
      console.log(`✅ Fleteros con seguimiento activo: ${idsFleterosActivos.size}`);
      
      const ventasConSeguimiento = ventasFiltradas.filter(venta => 
        venta.idFleteroCarga && idsFleterosActivos.has(venta.idFleteroCarga)
      );
      
      result.totalPedidosDescartadosPorSeguimiento = ventasFiltradas.length - ventasConSeguimiento.length;
      console.log(`📊 Ventas con seguimiento: ${ventasConSeguimiento.length}/${ventasFiltradas.length}`);
      console.log(`⏭️  Pedidos descartados por seguimiento: ${result.totalPedidosDescartadosPorSeguimiento}`);

      // 7. Eliminar duplicados por idPedido (CHESS puede enviar el mismo pedido múltiples veces)
      console.log(`\n🔄 ========== ELIMINANDO DUPLICADOS ==========`);
      const ventasUnicas = new Map<string, ChessVentaRaw>();
      let duplicadosEliminados = 0;
      
      for (const venta of ventasConSeguimiento) {
        try {
          if (!venta.planillaCarga) continue;
          const idPedido = this.extractIdPedido(venta.planillaCarga);
          
          if (!ventasUnicas.has(idPedido)) {
            ventasUnicas.set(idPedido, venta);
          } else {
            duplicadosEliminados++;
          }
        } catch (error) {
          // Ignorar ventas con formato inválido
          continue;
        }
      }
      
      const ventasSinDuplicados = Array.from(ventasUnicas.values());
      console.log(`✅ Ventas únicas: ${ventasSinDuplicados.length}`);
      console.log(`🗑️  Duplicados eliminados: ${duplicadosEliminados}`);

      // 8. Procesar cada venta única
      console.log(`\n📝 ========== PROCESANDO PEDIDOS Y LIQUIDACIONES ==========`);
      for (const venta of ventasSinDuplicados) {
        try {
          // Validar planillaCarga
          if (!venta.planillaCarga) {
            console.error(`❌ Venta sin planillaCarga, omitiendo...`);
            continue;
          }

          let idPedido: string;
          try {
            idPedido = this.extractIdPedido(venta.planillaCarga);
          } catch (error: any) {
            console.error(`❌ ${error.message}`);
            continue;
          }

          // Verificar si tiene datos de liquidación
          const tieneLiquidacion = this.hasLiquidacionData(venta);

          // Verificar si ya existe un pedido con este idPedido
          const pedidoExistente = await this.em.findOne(Pedido, 
            { idPedido: idPedido },
            { populate: ['fletero'] }
          );

          if (pedidoExistente) {
            // PEDIDO EXISTENTE: Verificar si necesita movimiento a TESORERIA
            if (tieneLiquidacion && !pedidoExistente.cobrado) {
              // Obtener estado actual del pedido
              const estadoActual = await this.getCurrentState(pedidoExistente);
              
              if (!estadoActual) {
                console.error(`❌ No se pudo obtener estado actual del pedido ${idPedido}`);
                continue;
              }

              // Crear movimiento a TESORERIA usando transacción
              await this.em.transactional(async (transactionalEm) => {
                const movimientoTesoreria = transactionalEm.create(Movimiento, {
                  fechaHora: new Date(),
                  estadoInicial: estadoActual,
                  estadoFinal: estadoTesoreria,
                  usuario: usuarioSistema,
                  pedido: pedidoExistente,
                });

                pedidoExistente.cobrado = true;
                
                await transactionalEm.persist(movimientoTesoreria).flush();
              });

              result.totalPedidosActualizadosConLiquidacion++;
              result.totalMovimientosTesoreriaCreados++;
              result.totalMovimientosCreados++;
              console.log(`✅ Pedido ${idPedido} actualizado con movimiento a TESORERIA (desde ${estadoActual.nombreEstado})`);
            } else if (tieneLiquidacion && pedidoExistente.cobrado) {
              console.log(`⏭️  Pedido ${idPedido} ya tiene liquidación, omitiendo...`);
            } else {
              console.log(`⏭️  Pedido ${idPedido} ya existe sin liquidación, omitiendo...`);
            }
            continue;
          }

          // PEDIDO NUEVO: Crear pedido y movimientos
          const fletero = await this.em.findOne(Fletero, { idFletero: venta.idFleteroCarga! });
          if (!fletero) {
            console.error(`❌ Fletero ${venta.idFleteroCarga} no encontrado para pedido ${idPedido}`);
            continue;
          }

          // Usar transacción para crear pedido y movimientos
          await this.em.transactional(async (transactionalEm) => {
            // Crear nuevo Pedido
            const nuevoPedido = transactionalEm.create(Pedido, {
              fechaHora: new Date(),
              idPedido: idPedido,
              fletero: fletero,
              cobrado: false,
            });

            // Crear primer movimiento (CHESS → PENDIENTE)
            const movimientoInicial = transactionalEm.create(Movimiento, {
              fechaHora: new Date(),
              estadoInicial: estadoChess,
              estadoFinal: estadoPendiente,
              usuario: usuarioSistema,
              pedido: nuevoPedido,
            });

            result.totalMovimientosCreados++;

            // Si tiene liquidación, crear segundo movimiento (PENDIENTE → TESORERIA)
            if (tieneLiquidacion) {
              // Esperar 1 segundo para evitar colisión de PK (fecha_hora se redondea a segundos en MySQL)
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              const movimientoTesoreria = transactionalEm.create(Movimiento, {
                fechaHora: new Date(),
                estadoInicial: estadoPendiente,
                estadoFinal: estadoTesoreria,
                usuario: usuarioSistema,
                pedido: nuevoPedido,
              });

              nuevoPedido.cobrado = true;
              result.totalMovimientosTesoreriaCreados++;
              result.totalMovimientosCreados++;
              
              await transactionalEm.persist([nuevoPedido, movimientoInicial, movimientoTesoreria]).flush();
              console.log(`✅ Pedido ${idPedido} creado con liquidación automática`);
            } else {
              await transactionalEm.persist([nuevoPedido, movimientoInicial]).flush();
              console.log(`✅ Pedido ${idPedido} creado sin liquidación`);
            }
          });

          result.totalPedidosCreados++;
        } catch (error: any) {
          const errorMsg = `Error procesando pedido ${venta.planillaCarga || 'sin planilla'}: ${error.message}`;
          console.error(`❌ ${errorMsg}`);
          result.errors.push(errorMsg);
        }
      }

      result.success = true;
      const endTime = new Date();
      const duration = (endTime.getTime() - startTime.getTime()) / 1000;

      console.log(`\n📊 ========== RESUMEN DE SINCRONIZACIÓN ==========`);
      console.log(`✅ Sincronización completada exitosamente`);
      console.log(`⏱️  Duración: ${duration.toFixed(2)} segundos`);
      console.log(`📦 Lotes procesados: ${result.lotesProcesados}`);
      console.log(`📦 Ventas obtenidas de CHESS: ${result.totalVentasObtenidas}`);
      console.log(`🔍 Ventas filtradas (válidas): ${result.totalVentasFiltradas}`);
      console.log(`🚚 Fleteros creados: ${result.totalFleterosCreados}`);
      console.log(`📝 Fleteros actualizados: ${result.totalFleterosActualizados}`);
      console.log(`⏭️  Pedidos descartados por seguimiento: ${result.totalPedidosDescartadosPorSeguimiento}`);
      console.log(`🆕 Pedidos creados: ${result.totalPedidosCreados}`);
      console.log(`💰 Pedidos actualizados con liquidación: ${result.totalPedidosActualizadosConLiquidacion}`);
      console.log(`📝 Movimientos creados: ${result.totalMovimientosCreados}`);
      console.log(`💵 Movimientos a TESORERIA: ${result.totalMovimientosTesoreriaCreados}`);
      if (result.errors.length > 0) {
        console.log(`⚠️  Errores: ${result.errors.length}`);
        result.errors.forEach((err) => console.log(`   - ${err}`));
      }
      console.log(`================================================\n`);

      return result;
    } catch (error: any) {
      result.success = false;
      const errorMsg = `Error general en sincronización: ${error.message}`;
      result.errors.push(errorMsg);
      console.error(`\n❌ ${errorMsg}`);
      console.error(error);
      return result;
    }
  }
}
