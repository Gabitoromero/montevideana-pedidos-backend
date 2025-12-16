import { AppError } from '../../shared/errors/AppError.js';
import axios, { AxiosInstance } from 'axios';

const CHESS_API_URL = process.env.CHESS_API_URL || 'http://localhost:8080/api';
const CHESS_API_KEY = process.env.CHESS_API_KEY || '';

export interface ChessPedido {
  nroPedido: string;
  cliente: string;
  fecha: string;
  estado: string;
  items: ChessPedidoItem[];
  total: number;
}

export interface ChessPedidoItem {
  codigo: string;
  descripcion: string;
  cantidad: number;
  precio: number;
}

export class ChessService {
  private api: AxiosInstance;
  private sessionId: string | null = null;
//
  constructor() {
      //1. Validamos que la URL exista para no arrancar el servidor "ciegos"
     const baseURL = process.env.CHESS_API_URL;
    
     if (!baseURL) {
       console.warn('⚠️ ADVERTENCIA: CHESS_API_URL no está definida en el .env');
     }

      //2. Creamos la instancia configurada
     this.api = axios.create({
       baseURL: baseURL,
       timeout: 10000, // 10 segundos. Si CHESS tarda más, cortamos para no colgar nuestro server.
       headers: {
         'Content-Type': 'application/json',
         'Accept': 'application/json',
       },
     });
  }

  private async fetchFromChess(endpoint: string): Promise<any> {
    try {
      const url = `${CHESS_API_URL}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CHESS_API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`CHESS API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw AppError.internal(`Error al conectar con CHESS: ${error.message}`);
      }
      throw AppError.internal('Error desconocido al conectar con CHESS');
    }
  }

  async getPedido(nroPedido: string): Promise<ChessPedido> {
    const data = await this.fetchFromChess(`/pedidos/${nroPedido}`);
    return data;
  }

  async getAllPedidos(params?: { desde?: string; hasta?: string; cliente?: string }): Promise<ChessPedido[]> {
    let endpoint = '/pedidos';
    const queryParams = new URLSearchParams();

    if (params?.desde) queryParams.append('desde', params.desde);
    if (params?.hasta) queryParams.append('hasta', params.hasta);
    if (params?.cliente) queryParams.append('cliente', params.cliente);

    if (queryParams.toString()) {
      endpoint += `?${queryParams.toString()}`;
    }

    const data = await this.fetchFromChess(endpoint);
    return data;
  }

  async searchPedidos(searchTerm: string): Promise<ChessPedido[]> {
    const data = await this.fetchFromChess(`/pedidos/search?q=${encodeURIComponent(searchTerm)}`);
    return data;
  }

  public async testConnection(): Promise<{ 
    success: boolean; 
    sessionId: string | null;
    message: string;
  }> {
    await this.login();
    return {
      success: true,
      sessionId: this.sessionId ? this.sessionId.substring(0, 30) + '...' : null,  //Mostrar solo parte por seguridad
      message: 'Conexión exitosa con CHESS. SessionId guardado en memoria.'
    };
  }

public async login(): Promise<void> {
    const username = process.env.CHESS_USER;
    const password = process.env.CHESS_PASSWORD;

    if (!username || !password) {
      throw new AppError('Credenciales de CHESS no configuradas en el backend', 500);
    }

    try {
      console.log(`🔄 Conectando a CHESS en: ${this.api.defaults.baseURL}...`);
      
     //Hacemos el POST. Axios convierte el objeto a JSON automáticamente.
      const response = await this.api.post('web/api/chess/v1/auth/login', {
        username: username,
        password: password,
      }, { withCredentials: true });

    // Capturamos la cookie "connect.sid" o similar que devuelve CHESS
      const cookies = response.headers['set-cookie'];
      
      if (!cookies || cookies.length === 0) {
        throw new Error('CHESS no devolvió cookies de sesión');
      }

     //Buscar cookie que empiece con sessionId=
      const sessionCookie = cookies.find((c: string) => c.startsWith("JSESSIONID="));
      if (!sessionCookie) {
        throw new Error("CHESS no devolvió sessionId.");
      }

     //Parsear valor real del sessionId
      const sessionId = sessionCookie.split(";")[0]; // "sessionId=XYZ123"

      this.sessionId = sessionId;

      console.log(`✅ Login en CHESS exitoso. Sesión guardada. SessionId: ${this.sessionId.substring(0, 30)}...`);

    } catch (error: any) {

      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.message;
        const url = error.config?.url;
        
        console.error('❌ Error en CHESS:');
        console.error('  URL completa:', `${this.api.defaults.baseURL}/${url}`);
        console.error('  Status:', status);
        console.error('  Message:', message);
        console.error('  Code:', error.code); // IMPORTANTE: puede ser ECONNREFUSED, ETIMEDOUT, etc.
        
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

  /**
    * Verifica si hay una sesión activa guardada.
    */
  public hasActiveSession(): boolean {
    return this.sessionId !== null;
  }

    /**
   * Método privado para hacer peticiones autenticadas a CHESS
   */
  private async requestWithAuth(endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any): Promise<any> {
    // Si no hay sesión activa, hacemos login primero
    if (!this.sessionId) {
      console.log('⚠️ No hay sesión activa. Iniciando login...');
      await this.login();
    }
  
    try {
      const response = await this.api.request({
        method,
        url: endpoint,
        data,
        headers: {
          'Cookie': this.sessionId, // Enviamos el sessionId como cookie
        },
      });
  
      return response.data;
  
    } catch (error: any) {
      // Si el error es 401, la sesión expiró -> reintentamos con nuevo login
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.log('🔄 Sesión expirada. Re-autenticando...');
        this.sessionId = null;
        await this.login();
        
        // Reintentamos la petición
        const retryResponse = await this.api.request({
          method,
          url: endpoint,
          data,
          headers: {
            'Cookie': this.sessionId,
          },
        });
        
        return retryResponse.data;
      }
  
      throw error;
    }
  }
}


