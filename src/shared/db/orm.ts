import { MikroORM, EntityManager, RequestContext } from '@mikro-orm/core';
import { MySqlDriver } from '@mikro-orm/mysql';
import { SqlHighlighter } from '@mikro-orm/sql-highlighter'
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let orm: MikroORM<MySqlDriver> | null = null;

export const initORM = async (): Promise<MikroORM<MySqlDriver>> => {
    if (orm) {
        return orm;
    }
orm = await MikroORM.init<MySqlDriver>({
        driver: MySqlDriver,
        highlighter: new SqlHighlighter(),
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        dbName: process.env.DB_NAME || 'montevideana_pedidos',
        entities: ['dist/**/*.entity.js'],
        entitiesTs: ['src/**/*.entity.ts'],
        debug: process.env.NODE_ENV === 'development',
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
        
        // --- CORRECCIÓN 1: Configuración del Pool en la raíz ---
        // MikroORM maneja el pool directamente, no dentro de driverOptions
        pool: {
            min: 2,
            max: 10,
            idleTimeoutMillis: 30000,
            acquireTimeoutMillis: 10000 // Aquí es donde debe ir el acquireTimeout
        },

        migrations: {
            path: path.join(__dirname, '../../../migrations'),
            pathTs: path.join(__dirname, '../../../migrations'),
        },
        schemaGenerator: {
            disableForeignKeys: true,
            createForeignKeyConstraints: true,
            ignoreSchema: [],
        },

        // --- CORRECCIÓN 2: Limpieza de driverOptions ---
        // Aquí solo van opciones nativas de la conexión de mysql2
        driverOptions: {
            // Ya no es necesario anidar en "connection" si usas driverOptions directamente, 
            // pero si tu versión lo requiere así, lo mantenemos limpio:
            connection: {
                connectTimeout: 10000, // OK: Tiempo para establecer conexión TCP
                // acquireTimeout: 10000, <-- ELIMINADO: Esto causaba el error rojo
                // timeout: 30000,        <-- ELIMINADO: A veces causa conflictos, mejor dejar el default
            }
        },
    });
    
    // Generar schema solo en desarrollo
    if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Actualizando schema de base de datos (desarrollo)...');
        await orm.schema.updateSchema();
        console.log('✅ Schema actualizado correctamente');
    } else {
        // En producción, asumimos que las migraciones ya fueron ejecutadas
        console.log('✅ ORM inicializado en modo producción');
        console.log('ℹ️  Asegúrate de ejecutar migraciones manualmente antes de desplegar');
    }

    return orm;
};

    export const getORM = (): MikroORM<MySqlDriver> => {
    if (!orm) {
        throw new Error('ORM no inicializado. Llama a initORM() primero.');
    }
    return orm;
    };

    export const getEM = (): EntityManager => {
    return getORM().em;
    };

    export const fork = (): EntityManager => {
    return getEM().fork();
    };

    export const closeORM = async (): Promise<void> => {
    if (orm) {
        await orm.close();
        orm = null;
    }
};

export { RequestContext };