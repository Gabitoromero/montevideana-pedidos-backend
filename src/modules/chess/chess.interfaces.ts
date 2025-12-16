// src/modules/chess/chess.interfaces.ts

// Esta interfaz representa la estructura cruda que devuelve CHESS
// Solo definimos los campos que nos importan por ahora.
export interface ChessVentaRaw {
  idPedido: number | string; // No estoy seguro si es number o string, pon ambos por seguridad
  dsFleteroCarga: string;    // El nombre del fletero
  dsVendedor?: string;       // A veces sirve saber quién lo vendió
  dtFecha: string;           // Fecha del pedido
  // Agrega aquí otros campos si descubres que los necesitas viendo el console.log
}

// Esta es la respuesta completa de la API (por si viene envuelta en un objeto 'data' o 'result')
export interface ChessAPIResponse {
    data: ChessVentaRaw[];
  // Si la API devuelve paginación u otros metadatos, irían aquí.
}