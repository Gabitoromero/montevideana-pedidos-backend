import { AppError } from '../../shared/errors/AppError.js';

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
}
