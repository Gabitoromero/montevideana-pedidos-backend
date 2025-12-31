/**
 * Utilidad para sanitizar strings en mensajes de error
 * Remueve caracteres especiales que podrían causar problemas
 */
export class StringUtil {
  /**
   * Sanitiza un string removiendo caracteres especiales
   * Permite solo: letras, números, espacios, guiones y guiones bajos
   */
  static sanitize(input: string): string {
    if (typeof input !== 'string') {
      return String(input);
    }
    return input.replace(/[^\w\s-]/g, '');
  }

  /**
   * Sanitiza un ID de pedido para uso seguro en mensajes
   */
  static sanitizePedidoId(idPedido: string): string {
    return this.sanitize(idPedido);
  }

  /**
   * Trunca un string a una longitud máxima
   */
  static truncate(input: string, maxLength: number = 100): string {
    if (input.length <= maxLength) {
      return input;
    }
    return input.substring(0, maxLength) + '...';
  }
}
