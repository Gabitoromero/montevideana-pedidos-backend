/**
 * Normaliza un número de teléfono al formato internacional de Argentina (549 + área + número)
 * y devuelve el chatId esperado por WAHA (ej: 5493415555555@c.us).
 * 
 * Soporta múltiples formatos locales e internacionales típicos de la base de datos de fleteros:
 * - Local estándar: "3415555555" -> "5493415555555@c.us"
 * - Local con prefijo "15" de celular: "341155555555" -> "5493415555555@c.us"
 * - Local con "0" de larga distancia: "03415555555" -> "5493415555555@c.us"
 * - Local con "0" y "15": "0341155555555" -> "5493415555555@c.us"
 * - Internacional incompleto (sin 9): "543415555555" -> "5493415555555@c.us"
 * - Internacional con "15": "54153415555555" -> "5493415555555@c.us"
 * - Internacional correcto: "5493415555555" -> "5493415555555@c.us"
 * - Sucio con caracteres especiales: "+54 9 341-555-5555" -> "5493415555555@c.us"
 */
export function normalizarTelefonoArgentina(telefono: string): string {
  // 1. Limpiar todos los caracteres no numéricos
  let numero = telefono.replace(/\D/g, '');

  if (!numero) return '';

  // 2. Quitar el "0" inicial de marcación nacional a larga distancia si existe (ej: 0341 -> 341)
  if (numero.startsWith('0')) {
    numero = numero.substring(1);
  }

  // 3. Normalizar prefijo internacional de Argentina (54)
  if (numero.startsWith('54')) {
    // Para WhatsApp en Argentina es obligatorio el "9" de móviles entre el 54 y el área
    if (numero.startsWith('5415')) {
      // Caso "54 15 ...": Quitar el "15" y poner el "9"
      numero = '549' + numero.substring(4);
    } else if (!numero.startsWith('549')) {
      // Caso "54 <área> ...": Insertar el "9" después del "54"
      numero = '549' + numero.substring(2);
    }
  } else {
    // 4. Si no empieza con "54", es un número local de Argentina (ej: 3415555555 o 34115555555)
    
    // Remoción del prefijo celular "15" intermedio.
    // Un celular argentino con código de área + "15" + número local siempre suma exactamente 12 dígitos.
    // Ej: 341 15 5555555 -> 12 dígitos. Si quitamos el "15", queda en 10 dígitos (3415555555).
    // Restringir esto a exactamente 12 dígitos evita falsos positivos con otros formatos (ej: 93415555555).
    if (numero.length === 12) {
      numero = numero.replace(/^(\d{2,4})15(\d{6,8})$/, '$1$2');
    }

    // Si empieza con "9" y tiene 11 dígitos (ej: 9 341 5555555), le falta el "54"
    if (numero.startsWith('9') && numero.length === 11) {
      numero = '54' + numero;
    } else {
      // En cualquier otro caso de número local (ej: 3415555555) -> le agregamos "549"
      numero = '549' + numero;
    }
  }

  return `${numero}@c.us`;
}
