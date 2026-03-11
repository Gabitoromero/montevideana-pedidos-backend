export type DiscordAlertSeverity = 'CRITICO' | 'ADVERTENCIA' | 'INFO';

const DISCORD_USER_ID = process.env.DISCORD_USER_ID || '368473961190916113';

/**
 * Enviar una alerta a Discord utilizando un webhook.
 * 
 * @param mensaje - El texto del mensaje a enviar.
 * @param severidad - 'CRITICO' (menciona al usuario, color rojo) o 'ADVERTENCIA' (sin mención, color amarillo).
 */
export async function sendDiscordAlert(mensaje: string, severidad: DiscordAlertSeverity): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.warn('⚠️ DISCORD_WEBHOOK_URL no configurado, no se pudo enviar alerta');
    return;
  }

  const esCritico = severidad === 'CRITICO';
  const color = esCritico ? 15158332 : 16776960; // rojo : amarillo
  const emoji = esCritico ? '🚨' : '⚠️';
  const titulo = esCritico 
    ? `${emoji} ALERTA CRÍTICA - WAHA` 
    : `${emoji} Notificación de Sistema - WAHA`;

  try {
    const body = {
      content: esCritico ? `<@${DISCORD_USER_ID}>` : undefined,
      username: 'Montevideana Monitoring',
      avatar_url: 'https://cdn-icons-png.flaticon.com/512/2099/2099190.png',
      embeds: [{
        title: titulo,
        description: mensaje.length > 2000 ? mensaje.substring(0, 1997) + '...' : mensaje,
        color,
        fields: [
          {
            name: '📅 Fecha y Hora',
            value: new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }),
            inline: true,
          },
          {
            name: '🏷️ Severidad',
            value: severidad,
            inline: true,
          },
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'Sistema de Pedidos Montevideana' },
      }],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(`❌ Discord respondió con status ${response.status}`);
    }
  } catch (error: any) {
    console.error(`❌ No se pudo enviar alerta a Discord: ${error.message}`);
  }
}
