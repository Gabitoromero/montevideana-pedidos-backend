import { AppError } from '../../shared/errors/AppError.js';
import axios, { AxiosInstance } from 'axios';
import { ChessVentaRaw, ResumenDocumento, ReporteDiagnostico } from './chess.interfaces.js';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

export class ChessService {
  private api: AxiosInstance;
  private jar: CookieJar;

  constructor() {
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

  // src/modules/chess/chess.service.ts

  // ... (tus imports y métodos anteriores)

  /**
   * 📊 Método exclusivo para generar el reporte de validación con el cliente
   */
  public async getDiagnostico(fecha: string): Promise<ReporteDiagnostico> {
    return this.requestWithAuth(async () => {
      console.log(`🕵️‍♂️ Generando diagnóstico para: ${fecha}`);

      // 1. Obtenemos TOOOODOS los datos crudos (sin filtros raros)
      const response = await this.api.get('/web/api/chess/v1/ventas', {
        params: {
          fechaDesde: fecha,
          fechaHasta: fecha,
          detallado: true,
          nroLote: 0
          // empresas: 1, // Descomenta si confirmaste que es necesario
        }
      });

      // Aseguramos que sea un array
      const rawData = (Array.isArray(response.data) ? response.data : response.data.data) as ChessVentaRaw[];
      
      if (!rawData) {
        return { fecha, totalRegistros: 0, desglosePorTipo: [] };
      }

      // 2. Agrupamos y calculamos estadísticas
      // Usamos un Map para ir acumulando los contadores por tipo de documento
      const statsMap = new Map<string, ResumenDocumento>();

      rawData.forEach((item) => {
        const key = item.idDocumento; // Ej: "FCVTA"

        if (!statsMap.has(key)) {
          statsMap.set(key, {
            tipo: key,
            descripcion: item.dsDocumento || 'Sin descripción',
            cantidadTotal: 0,
            conPedidoAsociado: 0,
            anulados: 0,
            montoTotal: 0,
            ejemploId: item.nrodoc // Guardamos el primero que vemos de ejemplo
          });
        }

        const stat = statsMap.get(key)!;
        stat.cantidadTotal++;
        stat.montoTotal += item.subtotalFinal || 0;

        if (item.idPedido > 0) {
          stat.conPedidoAsociado++;
        }

        if (item.anulado === 'SI') {
          stat.anulados++;
        }
      });

      // 3. Convertimos el Map a Array y ordenamos por cantidad
      const desglose = Array.from(statsMap.values()).sort((a, b) => b.cantidadTotal - a.cantidadTotal);

      return {
        fecha,
        totalRegistros: rawData.length,
        desglosePorTipo: desglose
      };
    });
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
}
