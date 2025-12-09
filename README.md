# Montevideana Pedidos - Backend

Backend para el sistema de gestión de estados de pedidos de **La Montevideana**.

## 📋 Descripción

Sistema backend que gestiona transiciones de estado de pedidos provenientes del ERP CHESS. No crea pedidos, solo maneja el historial de movimientos entre estados y valida las transiciones según reglas de negocio.

## 🏗️ Arquitectura

```
src/
├── app.ts                  # Aplicación Express
├── server.ts              # Punto de entrada
├── shared/               # Capa compartida
│   ├── auth/            # JWT y middleware de autenticación
│   ├── errors/          # Manejo de errores
│   ├── middlewares/     # Middlewares globales
│   ├── orm/            # Configuración MikroORM
│   └── utils/          # Utilidades (hash, date)
└── modules/             # Módulos de dominio
    ├── auth/           # Login y refresh tokens
    ├── usuarios/       # Gestión de usuarios
    ├── estados/        # Tipos de estado
    ├── estadoNecesario/ # Reglas de transición
    ├── movimientos/    # Historial de movimientos
    └── chess/          # Integración con ERP CHESS
```

## 🚀 Tecnologías

- **Node.js** (LTS)
- **TypeScript**
- **Express**
- **MikroORM** con MySQL
- **JWT** (access + refresh tokens)
- **bcrypt** para hash de contraseñas
- **Zod** para validaciones
- **PM2** para producción

## 📦 Instalación

```bash
# Instalar dependencias
pnpm install

# Copiar variables de entorno
cp .env.example .env

# Editar .env con tu configuración
```

## 🗄️ Base de Datos

Configurar MySQL y actualizar `.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=montevideana_pedidos
```

El esquema se genera automáticamente en desarrollo.

## 🛠️ Desarrollo

```bash
# Modo desarrollo con hot reload
pnpm dev

# Compilar TypeScript
pnpm build

# Iniciar en producción
pnpm start
```

## 🚢 Producción con PM2

```bash
# Compilar
pnpm build

# Iniciar con PM2
pnpm start:pm2

# Ver logs
pm2 logs montevideana-pedidos-backend

# Detener
pm2 stop montevideana-pedidos-backend
```

## 🔐 Autenticación

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "nombre": "Juan",
  "password": "password123"
}
```

Respuesta:

```json
{
  "success": true,
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "user": { ... }
  }
}
```

### Usar Token

```http
GET /api/movimientos
Authorization: Bearer {accessToken}
```

## 📍 Endpoints Principales

### Auth

- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Renovar token
- `GET /api/auth/me` - Usuario actual

### Usuarios

- `POST /api/usuarios` - Crear usuario
- `GET /api/usuarios` - Listar usuarios
- `GET /api/usuarios/:id` - Obtener usuario
- `PATCH /api/usuarios/:id` - Actualizar usuario
- `DELETE /api/usuarios/:id` - Eliminar usuario

### Estados

- `POST /api/estados` - Crear tipo de estado
- `GET /api/estados` - Listar estados
- `GET /api/estados/:codEstado` - Obtener estado
- `PATCH /api/estados/:codEstado` - Actualizar estado
- `DELETE /api/estados/:codEstado` - Eliminar estado

### Estados Necesarios (Reglas)

- `POST /api/estados-necesarios` - Crear regla
- `GET /api/estados-necesarios` - Listar reglas
- `GET /api/estados-necesarios/estado/:codEstado` - Reglas para un estado
- `DELETE /api/estados-necesarios/:id` - Eliminar regla

### Movimientos

- `POST /api/movimientos` - Crear movimiento (transición de estado)
- `GET /api/movimientos` - Listar movimientos (con filtros)
- `GET /api/movimientos/:id` - Obtener movimiento
- `GET /api/movimientos/pedido/:nroPedido` - Historial del pedido
- `GET /api/movimientos/pedido/:nroPedido/estado-actual` - Estado actual

### CHESS (ERP Externo)

- `GET /api/chess/pedidos` - Listar pedidos desde CHESS
- `GET /api/chess/pedidos/:nroPedido` - Obtener pedido desde CHESS
- `GET /api/chess/pedidos/search?q=...` - Buscar pedidos

## 🧪 Testing

Los archivos `.http` en cada módulo permiten probar los endpoints con extensiones como REST Client de VS Code.

## 📊 Modelo de Datos

### Usuario

- id, nombre, apellido, sector, passwordHash

### TipoEstado

- codEstado (PK), nombreEstado

### EstadoNecesario

- id, codEstado (FK), codNecesario (FK)

### Movimiento

- id, fechaHora, nroPedido, estadoInicial (FK), estadoFinal (FK), usuario (FK)

## 🔄 Flujo de Transición de Estado

1. Cliente llama `POST /api/movimientos`
2. Sistema valida que usuario existe
3. Sistema valida que estados inicial y final existen
4. Sistema valida que la transición es legal (EstadoNecesario)
5. Si todo es válido, crea el movimiento
6. Si no, retorna error 400

## 🌐 Nginx (Reverse Proxy)

Ejemplo de configuración:

```nginx
server {
    listen 80;
    server_name api.montevideana.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📝 Variables de Entorno

Ver `.env.example` para la lista completa.

## 👥 Contribución

Este es un proyecto privado para **La Montevideana**.

## 📄 Licencia

ISC - Propiedad de RomeroSoft

---

Desarrollado con ❤️ por **RomeroSoft** para **La Montevideana**
