# Migración a Autenticación con Cookies HTTP-Only

## 🔒 ¿Qué cambió?

El backend ahora usa **cookies HTTP-only** para almacenar tokens JWT en lugar de enviarlos en el JSON de respuesta. Esto mejora significativamente la seguridad contra ataques XSS.

### Antes (Vulnerable ❌)

```javascript
// El frontend recibía tokens en JSON
const response = await fetch("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({ username, password }),
});
const { accessToken, refreshToken } = await response.json();
localStorage.setItem("token", accessToken); // ❌ Vulnerable a XSS
```

### Ahora (Seguro ✅)

```javascript
// El backend setea cookies automáticamente
const response = await fetch("/api/auth/login", {
  method: "POST",
  credentials: "include", // ✅ CRÍTICO: Envía cookies
  body: JSON.stringify({ username, password }),
});
const { user } = await response.json(); // Solo datos del usuario
// Las cookies se manejan automáticamente por el navegador
```

---

## 📋 Cambios Requeridos en el Frontend

### 1. Configurar `credentials: 'include'` en TODAS las peticiones

**Fetch API:**

```javascript
fetch("http://localhost:3000/api/auth/login", {
  method: "POST",
  credentials: "include", // ✅ Incluir cookies
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username, password }),
});
```

**Axios:**

```javascript
// Configuración global
axios.defaults.withCredentials = true;

// O por petición
axios.post(
  "/api/auth/login",
  { username, password },
  {
    withCredentials: true,
  }
);
```

### 2. Actualizar el flujo de Login

**Antes:**

```javascript
const login = async (username, password) => {
  const response = await authService.login(username, password);
  localStorage.setItem("accessToken", response.accessToken); // ❌ Eliminar
  localStorage.setItem("refreshToken", response.refreshToken); // ❌ Eliminar
  setUser(response.user);
};
```

**Ahora:**

```javascript
const login = async (username, password) => {
  const response = await authService.login(username, password);
  // Las cookies se setean automáticamente
  setUser(response.user); // ✅ Solo guardar datos del usuario
};
```

### 3. Actualizar el flujo de Refresh Token

**Antes:**

```javascript
const refresh = async () => {
  const refreshToken = localStorage.getItem("refreshToken"); // ❌ Eliminar
  const response = await authService.refresh(refreshToken);
  localStorage.setItem("accessToken", response.accessToken); // ❌ Eliminar
};
```

**Ahora:**

```javascript
const refresh = async () => {
  // El refresh token viene automáticamente de la cookie
  const response = await authService.refresh(); // Sin parámetros
  setUser(response.user);
};
```

### 4. Actualizar el flujo de Logout

**Antes:**

```javascript
const logout = () => {
  localStorage.removeItem("accessToken"); // ❌ Eliminar
  localStorage.removeItem("refreshToken"); // ❌ Eliminar
  setUser(null);
};
```

**Ahora:**

```javascript
const logout = async () => {
  await authService.logout(); // ✅ Llama al endpoint que limpia cookies
  setUser(null);
};
```

### 5. Eliminar headers `Authorization` de las peticiones

**Antes:**

```javascript
axios.get("/api/usuarios", {
  headers: {
    Authorization: `Bearer ${localStorage.getItem("accessToken")}`, // ❌ Eliminar
  },
});
```

**Ahora:**

```javascript
axios.get("/api/usuarios", {
  withCredentials: true, // ✅ Las cookies se envían automáticamente
});
```

---

## 🔄 Compatibilidad Temporal

El backend **actualmente soporta ambos métodos** durante la transición:

1. ✅ **Cookies HTTP-only** (método seguro, recomendado)
2. ✅ **Authorization header** (método antiguo, para compatibilidad)

Esto significa que el frontend actual seguirá funcionando mientras migras. Una vez completada la migración, se puede remover el soporte de headers.

---

## 🧪 Cómo Probar

### Test 1: Login con cookies

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -c cookies.txt -v
```

Verificar:

- ✅ Response incluye `Set-Cookie: accessToken=...`
- ✅ Response incluye `Set-Cookie: refreshToken=...`
- ✅ Cookies tienen flags `HttpOnly; SameSite=Strict`

### Test 2: Acceso con cookie

```bash
curl http://localhost:3000/api/auth/me \
  -b cookies.txt
```

Verificar:

- ✅ Response status 200
- ✅ Response contiene datos del usuario

### Test 3: Logout

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt -c cookies.txt -v
```

Verificar:

- ✅ Response incluye `Set-Cookie` con `Max-Age=0`

---

## 🔐 Configuración de Seguridad

Las cookies están configuradas con los siguientes flags de seguridad:

```typescript
{
  httpOnly: true,        // No accesible desde JavaScript
  secure: true,          // Solo HTTPS (en producción)
  sameSite: 'strict',    // Protección CSRF
  maxAge: 900000,        // 15 minutos (access token)
  path: '/'              // Disponible en toda la app
}
```

---

## ⚙️ Variables de Entorno

Agregar a tu archivo `.env`:

```bash
# Secret para firmar cookies (genera uno nuevo)
COOKIE_SECRET=tu_secret_aleatorio_aqui
```

Generar secret seguro:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📚 Endpoints Actualizados

### POST `/api/auth/login`

**Request:**

```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "nombre": "Admin",
      "apellido": "User",
      "sector": "admin"
    }
  }
}
```

**Cookies seteadas:**

- `accessToken` (15 minutos)
- `refreshToken` (7 días)

---

### POST `/api/auth/refresh`

**Request:** Vacío (lee refresh token de cookie)

**Response:**

```json
{
  "success": true,
  "data": {
    "user": { ... }
  }
}
```

**Cookies actualizadas:**

- `accessToken` (nuevo token)

---

### POST `/api/auth/logout` (NUEVO)

**Request:** Vacío

**Response:**

```json
{
  "success": true,
  "message": "Sesión cerrada correctamente"
}
```

**Cookies limpiadas:**

- `accessToken`
- `refreshToken`

---

## ❓ Preguntas Frecuentes

### ¿Por qué es más seguro?

Las cookies HTTP-only no son accesibles desde JavaScript, por lo que un script malicioso (XSS) no puede robar los tokens.

### ¿Funciona con CORS?

Sí, pero debes configurar `credentials: 'include'` en el frontend y el backend ya tiene `credentials: true` en CORS.

### ¿Qué pasa con el frontend actual?

Seguirá funcionando gracias al soporte dual. Migra cuando estés listo.

### ¿Cuándo remover el soporte de headers?

Después de verificar que el frontend migrado funciona correctamente en todos los entornos.

---

## 🚀 Próximos Pasos

1. ✅ Backend implementado con cookies
2. ⏳ Migrar frontend para usar `credentials: 'include'`
3. ⏳ Probar en desarrollo
4. ⏳ Probar en staging
5. ⏳ Desplegar a producción
6. ⏳ Remover soporte de Authorization header (opcional)
