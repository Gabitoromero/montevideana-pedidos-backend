import 'dotenv/config';
import { createApp } from './app.js';
import { initORM, RequestContext } from './shared/db/orm.js';
import { initChessScheduler } from './modules/chess/chess.scheduler.js';
import { initWahaScheduler } from './modules/waha/waha.scheduler.js';

const PORT = process.env.PORT || 3001;

async function bootstrap() {
  try {
    // Inicializar MikroORM
    console.log('🔌 Conectando a la base de datos...');
    const orm = await initORM();
    console.log('✅ Base de datos conectada correctamente');

    // Crear aplicación Express
    const app = createApp();

    // Middleware para crear un EntityManager por request
    app.use((req, res, next) => {
      RequestContext.create(orm.em, next);
    });

    // Iniciar scheduler de CHESS solo si no está desactivado
    const disableScheduler = process.env.DISABLE_SCHEDULER === 'true';

    if (disableScheduler) {
      // SOY UN WORKER DE LA API: Levanto Express
      app.listen(PORT, () => {
        console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/health`);
        console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
        console.log(`📦 Entorno: ${process.env.NODE_ENV || 'development'}`);
      });
    } else {
      // SOY EL SCHEDULER: NO levanto Express, solo crons
      console.log('⏰ Iniciando scheduler de sincronización CHESS...');
      const chessScheduler = await initChessScheduler(orm);
      console.log('✅ Scheduler CHESS activo');

      console.log('⏰ Iniciando scheduler de monitoreo WAHA...');
      const wahaScheduler = initWahaScheduler();
      console.log('✅ Scheduler WAHA activo');

      // Manejo de señales de cierre con scheduler
      const gracefulShutdown = async (signal: string) => {
        console.log(`\n${signal} recibido. Cerrando servidor...`);

        // Detener schedulers
        chessScheduler.stop();
        wahaScheduler.stop();

        // Cerrar conexión a BD
        await orm.close();
        console.log('✅ Conexión a base de datos cerrada');
        process.exit(0);
      };

      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    }
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

bootstrap();
