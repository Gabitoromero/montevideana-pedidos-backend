import 'dotenv/config';
import { createApp } from './app.js';
import { initORM, RequestContext } from './shared/db/orm.js';

const PORT = process.env.PORT || 3000;

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

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
      console.log(`📦 Entorno: ${process.env.NODE_ENV || 'development'}`);
    });

    // Manejo de señales de cierre
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} recibido. Cerrando servidor...`);
      await orm.close();
      console.log('✅ Conexión a base de datos cerrada');
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

bootstrap();
