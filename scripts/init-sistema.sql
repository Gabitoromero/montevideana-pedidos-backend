-- Script de inicialización para Montevideana Pedidos
-- Generado automáticamente para coincidir con el esquema de MikroORM
-- Ejecutar en base de datos vacía

USE montevideana_pedidos;

-- ==========================================
-- 1. CREACIÓN DE TABLAS (Schema MikroORM)
-- ==========================================

set names utf8mb4;

create table `fleteros` (
    `id_fletero` int unsigned not null auto_increment primary key,
    `ds_fletero` varchar(255) not null,
    `seguimiento` tinyint(1) not null default true
) default character set utf8mb4 engine = InnoDB;

create table `pedidos` (
    `id_pedido` varchar(15) not null,
    `fecha_hora` datetime not null,
    `cobrado` tinyint(1) not null default false,
    `fletero_id_fletero` int unsigned not null,
    primary key (`id_pedido`)
) default character set utf8mb4 engine = InnoDB;

alter table `pedidos`
add index `pedidos_fletero_id_fletero_index` (`fletero_id_fletero`);

alter table `pedidos` add index `pedidos_cobrado_index` (`cobrado`);

alter table `pedidos`
add index `pedidos_fecha_hora_index` (`fecha_hora`);

create table `tipos_estado` (
    `id` int unsigned not null auto_increment primary key,
    `nombre_estado` varchar(255) not null
) default character set utf8mb4 engine = InnoDB;

alter table `tipos_estado`
add unique `tipos_estado_nombre_estado_unique` (`nombre_estado`);

create table `reglas` (
    `id` int unsigned not null auto_increment primary key,
    `id_estado_id` int unsigned not null,
    `id_estado_necesario_id` int unsigned not null
) default character set utf8mb4 engine = InnoDB;

alter table `reglas`
add index `reglas_id_estado_id_index` (`id_estado_id`);

alter table `reglas`
add index `reglas_id_estado_necesario_id_index` (`id_estado_necesario_id`);

create table `usuarios` (
    `id` int unsigned not null auto_increment primary key,
    `username` varchar(255) not null,
    `nombre` varchar(255) not null,
    `apellido` varchar(255) not null,
    `sector` varchar(255) not null,
    `password_hash` varchar(255) not null,
    `activo` bool not null
) default character set utf8mb4 engine = InnoDB;

alter table `usuarios`
add unique `usuarios_username_unique` (`username`);

create table `movimientos` (
    `fecha_hora` datetime not null,
    `pedido_id_pedido` varchar(15) not null,
    `estado_inicial_id` int unsigned not null,
    `estado_final_id` int unsigned not null,
    `usuario_id` int unsigned not null,
    primary key (
        `fecha_hora`,
        `pedido_id_pedido`
    )
) default character set utf8mb4 engine = InnoDB;

alter table `movimientos`
add index `movimientos_pedido_id_pedido_index` (`pedido_id_pedido`);

alter table `movimientos`
add index `movimientos_estado_inicial_id_index` (`estado_inicial_id`);

alter table `movimientos`
add index `movimientos_estado_final_id_index` (`estado_final_id`);

alter table `movimientos`
add index `movimientos_usuario_id_index` (`usuario_id`);

alter table `movimientos`
add index `movimientos_fecha_hora_index` (`fecha_hora`);

alter table `pedidos`
add constraint `pedidos_fletero_id_fletero_foreign` foreign key (`fletero_id_fletero`) references `fleteros` (`id_fletero`) on update cascade;

alter table `reglas`
add constraint `reglas_id_estado_id_foreign` foreign key (`id_estado_id`) references `tipos_estado` (`id`) on update cascade;

alter table `reglas`
add constraint `reglas_id_estado_necesario_id_foreign` foreign key (`id_estado_necesario_id`) references `tipos_estado` (`id`) on update cascade;

alter table `movimientos`
add constraint `movimientos_pedido_id_pedido_foreign` foreign key (`pedido_id_pedido`) references `pedidos` (`id_pedido`) on update cascade;

alter table `movimientos`
add constraint `movimientos_estado_inicial_id_foreign` foreign key (`estado_inicial_id`) references `tipos_estado` (`id`) on update cascade;

alter table `movimientos`
add constraint `movimientos_estado_final_id_foreign` foreign key (`estado_final_id`) references `tipos_estado` (`id`) on update cascade;

alter table `movimientos`
add constraint `movimientos_usuario_id_foreign` foreign key (`usuario_id`) references `usuarios` (`id`) on update cascade;

-- ==========================================
-- 2. DATOS INICIALES (Seed Data)
-- ==========================================

-- 2.1 Crear Usuario Sistema
-- Password: "vivacristorey"
INSERT INTO
    usuarios (
        username,
        nombre,
        apellido,
        sector,
        password_hash,
        activo
    )
VALUES (
        'CHESS',
        'Sistema',
        'CHESS',
        'CHESS',
        '$2a$10$YourGeneratedHashHere',
        true
    );
-- Nota: En producción, usa el seeder 'pnpm seed' para generar el hash real, o genera uno válido con bcrypt.

-- 2.2 Crear Estados del Sistema
INSERT INTO
    tipos_estado (id, nombre_estado)
VALUES (1, 'CHESS'),
    (2, 'PENDIENTE'),
    (3, 'EN PREPARACION'),
    (4, 'PREPARADO'),
    (5, 'PAGADO'),
    (6, 'ENTREGADO');

-- 2.3 Crear Reglas de Transición
-- Mapeo de columnas: id_estado_id = Estado Destino, id_estado_necesario_id = Estado Requerido Previo

-- EN PREPARACION (3) necesita PENDIENTE (2)
INSERT INTO
    reglas (
        id_estado_id,
        id_estado_necesario_id
    )
VALUES (3, 2);

-- PREPARADO (4) necesita PENDIENTE (2)
INSERT INTO
    reglas (
        id_estado_id,
        id_estado_necesario_id
    )
VALUES (4, 2);

-- PREPARADO (4) necesita EN PREPARACION (3)
INSERT INTO
    reglas (
        id_estado_id,
        id_estado_necesario_id
    )
VALUES (4, 3);

-- ENTREGADO (6) necesita PENDIENTE (2)
INSERT INTO
    reglas (
        id_estado_id,
        id_estado_necesario_id
    )
VALUES (6, 2);

-- ENTREGADO (6) necesita EN PREPARACION (3)
INSERT INTO
    reglas (
        id_estado_id,
        id_estado_necesario_id
    )
VALUES (6, 3);

-- ENTREGADO (6) necesita PREPARADO (4)
INSERT INTO
    reglas (
        id_estado_id,
        id_estado_necesario_id
    )
VALUES (6, 4);

-- ENTREGADO (6) necesita PAGADO (5)
INSERT INTO
    reglas (
        id_estado_id,
        id_estado_necesario_id
    )
VALUES (6, 5);

-- ==========================================
-- 3. VERIFICACIÓN
-- ==========================================

SELECT 'Base de datos inicializada correctamente' as status;