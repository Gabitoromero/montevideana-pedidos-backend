import { ChessService } from './chess.service.js';

export class ChessController {
  private chessService = new ChessService();

  async getPedido(nroPedido: string) {
    const pedido = await this.chessService.getPedido(nroPedido);
    return pedido;
  }

  async getAllPedidos(params?: { desde?: string; hasta?: string; cliente?: string }) {
    const pedidos = await this.chessService.getAllPedidos(params);
    return pedidos;
  }

  async searchPedidos(searchTerm: string) {
    const pedidos = await this.chessService.searchPedidos(searchTerm);
    return pedidos;
  }
}
