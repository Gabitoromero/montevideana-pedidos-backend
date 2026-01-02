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
        debug: process.env.NODE_ENV !== 'production',
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
        migrations: {
            path: path.join(__dirname, '../../../migrations'),
            pathTs: path.join(__dirname, '../../../migrations'),
        },
        schemaGenerator: {
            disableForeignKeys: true,
            createForeignKeyConstraints: true,
            ignoreSchema: [],
        },
        driverOptions: {
            connection: {
                // Timeouts para prevenir conexiones colgadas
                connectTimeout: 10000,      // 10 segundos para conectar
                acquireTimeout: 10000,      // 10 segundos para adquirir conexión del pool
                timeout: 30000,             // 30 segundos timeout general
            },
            pool: {
                min: 2,                     // Mínimo de conexiones en el pool
                max: 10,                    // Máximo de conexiones en el pool
                idleTimeoutMillis: 30000,   // Cerrar conexiones inactivas después de 30s
                acquireTimeoutMillis: 10000 // Timeout para adquirir del pool
            }
        },
    });
    
    // Generar schema solo en desarrollo
    if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Actualizando schema de base de datos (desarrollo)...');
        await orm.schema.updateSchema();
    } else {
        // En producción, solo verificar que el schema está sincronizado
        console.log('🔍 Verificando sincronización de schema...');
        const diff = await orm.schema.getUpdateSchemaSQL();
        if (diff.length > 0) {
            console.warn('⚠️  ADVERTENCIA: El schema de base de datos no está sincronizado con las entidades');
            console.warn('⚠️  Ejecuta las migraciones manualmente antes de continuar');
            throw new Error('Schema desincronizado. Ejecuta migraciones manualmente.');
        } else {
            console.log('✅ Schema sincronizado correctamente');
        }
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