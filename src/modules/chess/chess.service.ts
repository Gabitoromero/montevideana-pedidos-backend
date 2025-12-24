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

export class ChessService {
  private api: AxiosInstance;
  private jar: CookieJar;
  private em: EntityManager;

  constructor(em: EntityManager) {
    this.em = em;
    const baseURL = process.env.CHESS_API_URL;
    
    if (!baseURL) {
      console.warn('⚠️ ADVERTENCIA: CHESS_API_URL no está definida en el .env');
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
        timeout: 10000,
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

  if (!usuario || !password) {
    throw new AppError('Credenciales de CHESS no configuradas en el backend', 500);
  }

  try {
    console.log(`🔄 Conectando a CHESS en: ${this.api.defaults.baseURL}...`);
    console.log(`👤 Usuario: ${usuario}`);
    
    const response = await this.api.post('web/api/chess/v1/auth/login', {
      usuario,
      password,
    });

    console.log('✅ Login CHESS exitoso.');
    console.log('📦 Response data:', response.data);
    
    // ✅ EXTRAER sessionId del BODY
    const sessionId = response.data?.sessionId;
    const expires = response.data?.expires;
    
    if (!sessionId) {
      throw new AppError('CHESS no devolvió sessionId en la respuesta', 500);
    }

    console.log(`🔐 SessionId recibido: ${sessionId.substring(0, 40)}...`);
    
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
    console.log(`🍪 Cookies guardadas: ${cookies.length}`);
    
    const savedCookie = cookies.find(c => c.key === 'JSESSIONID');
    if (savedCookie) {
      console.log(`🔐 JSESSIONID en jar: ${savedCookie.value.substring(0, 40)}...`);
    } else {
      console.warn('⚠️ No se pudo guardar JSESSIONID en el jar');
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
    // Verificar si hay cookies activas
    const cookies = await this.jar.getCookies(this.api.defaults.baseURL!);
    if (cookies.length === 0) {
      console.log('🔐 No hay cookies. Haciendo login...');
      await this.login();
    }

    try {
      const currentCookies = await this.jar.getCookies(this.api.defaults.baseURL!);
      const jsession = currentCookies.find(c => c.key === 'JSESSIONID');
      console.log(`🔐 Intento 1 con JSESSIONID: ${jsession?.value.substring(0, 30)}...`);
    
      return await requestFn();
    } catch (error: any) {

      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        console.warn('⚠️ Sesión CHESS caducada. Renovando credenciales...');
        await this.jar.removeAllCookies();
        await this.login();
        
        // Verificar la cookie después del login
        const newCookies = await this.jar.getCookies(this.api.defaults.baseURL!);
        const newJsession = newCookies.find(c => c.key === 'JSESSIONID');
        console.log(`🔐 Intento 2 con JSESSIONID: ${newJsession?.value.substring(0, 30)}...`);
        
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
        // ✅ Log detallado del error 500
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
  public async getAllVentasDelDia(fecha: string): Promise<ChessVentaRaw[]> {
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

        const response = await this.api.get<ChessAPIResponse>('web/api/chess/v1/ventas/', config);
        
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

      console.log(`🎯 Total de ventas obtenidas: ${todasLasVentas.length}`);
      return todasLasVentas;
    });
  }

  /**
   * Filtrar ventas válidas según los criterios especificados
   */
  private filterValidSales(ventas: ChessVentaRaw[], fecha: string): ChessVentaRaw[] {
    return ventas.filter((venta) => {
      // 1. idEmpresa = 1
      if (venta.idEmpresa !== 1) return false;

      // 2. dsEmpresa = "MONTHELADO S.A."
      if (venta.dsEmpresa !== 'MONTHELADO S.A.') return false;

      // 3. anulado = "NO"
      if (venta.anulado !== 'NO') return false;

      // 4. fechaComprobante = fecha actual
      if (venta.fechaComprobante !== fecha) return false;

      // 5. fechaEntrega = fecha actual
      if (venta.fechaEntrega !== fecha) return false;

      // 6. fechaAlta = fecha actual
      if (venta.fechaAlta !== fecha) return false;

      // 7. nombreCliente ≠ "CONSUMIDOR FINAL"
      if (venta.nombreCliente === 'CONSUMIDOR FINAL') return false;

      // 8. idFleteroCarga ≠ 0 (tiene fletero asignado)
      if (venta.idFleteroCarga === 0) return false;

      // 9. dsSucursal = "CASA CENTRAL ROSARIO"
      if (venta.dsSucursal !== 'CASA CENTRAL ROSARIO') return false;

      // 10. idPedido ≠ 0 (debe tener número de pedido)
      if (!venta.idPedido || venta.idPedido === 0) return false;

      return true;
    });
  }

  /**
   * Sincronizar ventas de CHESS con el sistema interno
   */
  public async syncVentas(): Promise<ChessSyncResult> {
    const startTime = new Date();
    console.log(`\n🚀 ========== INICIO SINCRONIZACIÓN CHESS ==========`);
    console.log(`⏰ Hora de inicio: ${startTime.toLocaleString('es-AR')}`);

    const result: ChessSyncResult = {
      success: false,
      timestamp: startTime.toISOString(),
      totalVentasObtenidas: 0,
      totalVentasFiltradas: 0,
      totalPedidosCreados: 0,
      totalMovimientosCreados: 0,
      lotesProcesados: 0,
      errors: [],
    };

    try {
      // 1. Validar que existan Usuario "CHESS" y TipoEstado "CHESS" y "PENDIENTE"
      const usuarioChess = await this.em.findOne(Usuario, { username: 'CHESS' });
      if (!usuarioChess) {
        throw new AppError('Usuario "CHESS" no existe en la base de datos', 500);
      }

      const estadoChess = await this.em.findOne(TipoEstado, { nombreEstado: 'CHESS' });
      if (!estadoChess) {
        throw new AppError('TipoEstado "CHESS" no existe en la base de datos', 500);
      }

      const estadoPendiente = await this.em.findOne(TipoEstado, { nombreEstado: 'PENDIENTE' });
      if (!estadoPendiente) {
        throw new AppError('TipoEstado "PENDIENTE" no existe en la base de datos', 500);
      }

      console.log(`✅ Validaciones iniciales completadas`);

      // 2. Obtener fecha actual en formato YYYY-MM-DD
      const hoy = new Date();
      const fechaStr = hoy.toISOString().split('T')[0].replace(/-/g, '/');
      console.log(`📅 Fecha de sincronización: ${fechaStr}`);

      // 3. Obtener todas las ventas del día
      const todasLasVentas = await this.getAllVentasDelDia(fechaStr);
      result.totalVentasObtenidas = todasLasVentas.length;

      // 4. Filtrar ventas válidas
      const ventasFiltradas = this.filterValidSales(todasLasVentas, fechaStr);
      result.totalVentasFiltradas = ventasFiltradas.length;
      console.log(`🔍 Ventas filtradas (válidas): ${ventasFiltradas.length}/${todasLasVentas.length}`);

      // 5. Procesar cada venta filtrada
      for (const venta of ventasFiltradas) {
        try {
          // Verificar si ya existe un pedido con este idPedido en el día de hoy
          const pedidoExistente = await this.em.count(Pedido, {
            idPedido: venta.idPedido!,
            fechaHora: {
              $gte: new Date(hoy.setHours(0, 0, 0, 0)),
              $lte: new Date(hoy.setHours(23, 59, 59, 999)),
            },
          });

          if (pedidoExistente > 0) {
            console.log(`⏭️  Pedido ${venta.idPedido} ya existe, omitiendo...`);
            continue;
          }

          // Crear nuevo Pedido
          const nuevoPedido = this.em.create(Pedido, {
            fechaHora: new Date(),
            idPedido: venta.idPedido!,
            dsFletero: venta.dsFleteroCarga || '',
          });

          // Crear nuevo Movimiento (CHESS → PENDIENTE)
          const nuevoMovimiento = this.em.create(Movimiento, {
            fechaHora: new Date(),
            estadoInicial: estadoChess,
            estadoFinal: estadoPendiente,
            usuario: usuarioChess,
            pedido: nuevoPedido,
          });

          await this.em.persist([nuevoPedido, nuevoMovimiento]).flush();

          result.totalPedidosCreados++;
          result.totalMovimientosCreados++;
          console.log(`✅ Pedido ${venta.idPedido} creado exitosamente`);
        } catch (error: any) {
          const errorMsg = `Error procesando pedido ${venta.idPedido}: ${error.message}`;
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
      console.log(`📦 Ventas obtenidas de CHESS: ${result.totalVentasObtenidas}`);
      console.log(`🔍 Ventas filtradas (válidas): ${result.totalVentasFiltradas}`);
      console.log(`🆕 Pedidos creados: ${result.totalPedidosCreados}`);
      console.log(`📝 Movimientos creados: ${result.totalMovimientosCreados}`);
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
