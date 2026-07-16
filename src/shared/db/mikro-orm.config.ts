import { MikroORM } from '@mikro-orm/core';
import { Migrator } from '@mikro-orm/migrations';
import { MySqlDriver } from '@mikro-orm/mysql';
import { SqlHighlighter } from '@mikro-orm/sql-highlighter';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
    extensions: [Migrator],
    driver: MySqlDriver,
    highlighter: new SqlHighlighter(),
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    dbName: process.env.DB_NAME || 'montevideana_pedidos',
    entities: ['dist/**/*.entity.js'],
    entitiesTs: ['src/**/*.entity.ts'],
    debug: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    pool: { min: 2, max: 5, idleTimeoutMillis: 30000, acquireTimeoutMillis: 10000 },
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
        connection: { connectTimeout: 10000 }
    },
};
export default config;
