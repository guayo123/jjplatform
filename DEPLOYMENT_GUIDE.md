# 🚀 Guía de Despliegue - JJPlatform

## Backend en Railway

### 1️⃣ Preparación Inicial

**Requisitos:**
- Cuenta en [Railway.app](https://railway.app)
- Repositorio en GitHub con tu código

### 2️⃣ Crear Proyecto en Railway

1. Accede a https://railway.app
2. Haz clic en **"New Project"**
3. Selecciona **"Deploy from GitHub"**
4. Conecta tu cuenta de GitHub y selecciona el repositorio `jjplatform`
5. Railway detectará automáticamente el Dockerfile

### 3️⃣ Base de Datos PostgreSQL

1. En el dashboard de Railway, haz clic en **"+ New"**
2. Selecciona **"Database"** → **"PostgreSQL"**
3. Se creará automáticamente una base de datos
4. Railway proporcionará las variables de entorno automáticamente

### 4️⃣ Configurar Variables de Entorno

En el dashboard de Railway, ve a **"Variables"** y añade/configura:

```
DATABASE_URL=postgresql://user:password@host:port/jjplatform
DB_PASSWORD=<tu-contraseña-db>
JWT_SECRET=<tu-secreto-jwt-seguro-min-32-caracteres>
CORS_ORIGINS=https://tu-dominio-vercel.vercel.app,https://www.tu-dominio.com
FILE_UPLOAD_DIR=/app/uploads
SPRING_PROFILES_ACTIVE=prod
```

⚠️ **IMPORTANTE**: Railway inyecta automáticamente `DATABASE_URL`. Asegúrate de que tu `application-prod.yml` lo use.

### 5️⃣ Actualizar Configuración de Producción

Modifica `backend/src/main/resources/application-prod.yml`:

```yaml
spring:
  application:
    name: jjplatform-api

  datasource:
    url: ${DATABASE_URL}
    driver-class-name: org.postgresql.Driver
    hikari:
      maximum-pool-size: 5
      minimum-idle: 1

  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: false

  servlet:
    multipart:
      max-file-size: 5MB
      max-request-size: 5MB

server:
  port: ${PORT:8081}
  servlet:
    context-path: /api

app:
  jwt:
    secret: ${JWT_SECRET}
    expiration-ms: 86400000
  file:
    upload-dir: ${FILE_UPLOAD_DIR:/tmp/uploads}
  cors:
    allowed-origins: ${CORS_ORIGINS:http://localhost:5173}
```

### 6️⃣ Deploy

Railway auto-detectará cambios en GitHub y hará deploy automático. O manualmente:

```bash
# Desde la CLI de Railway (opcional)
railway up
```

### 7️⃣ Obtener URL del Backend

En el dashboard de Railway:
- Ve a **"Deployments"**
- Verás algo como: `https://jjplatform-prod-xxxx.up.railway.app`
- Guarda esta URL para usarla en el frontend

---

## Frontend en Vercel

### 1️⃣ Preparación

**Requisitos:**
- Cuenta en [Vercel](https://vercel.com)
- El repositorio en GitHub

### 2️⃣ Crear Proyecto en Vercel

1. Accede a https://vercel.com
2. Haz clic en **"New Project"**
3. Importa tu repositorio GitHub
4. Selecciona la carpeta `frontend` como **"Root Directory"**

### 3️⃣ Configurar Build

Durante la importación, asegúrate:

- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 4️⃣ Variables de Entorno

En los **Environment Variables**, añade:

```
VITE_API_BASE_URL=https://jjplatform-prod-xxxx.up.railway.app/api
```

Reemplaza con la URL que obtuviste de Railway.

### 5️⃣ Actualizar Frontend

Asegúrate de que tu cliente HTTP (probablemente en `frontend/src/api/client.ts`) use la variable:

```typescript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default client;
```

### 6️⃣ Deploy

Vercel hará deploy automáticamente cuando hagas push a `main` (o la rama que configures).

Para forzar un redeploy:
- Haz push a GitHub
- O en Vercel: **"Deployments"** → **"Redeploy"**

---

## 🔗 Variables de Entorno - Resumen Rápido

### Railway (Backend)
```
DATABASE_URL=postgresql://user:pass@host/jjplatform
DB_PASSWORD=<contraseña>
JWT_SECRET=<secreto-seguro-32+caracteres>
CORS_ORIGINS=https://tu-frontend.vercel.app
FILE_UPLOAD_DIR=/app/uploads
SPRING_PROFILES_ACTIVE=prod
```

### Vercel (Frontend)
```
VITE_API_BASE_URL=https://tu-backend-railway.up.railway.app/api
```

---

## ✅ Checklist Final

- [ ] Repositorio GitHub actualizado con cambios
- [ ] `application-prod.yml` configurado
- [ ] Proyecto en Railway creado y configurado
- [ ] Base de datos PostgreSQL en Railway
- [ ] Variables de entorno en Railway configuradas
- [ ] Proyecto en Vercel creado
- [ ] VITE_API_BASE_URL configurado en Vercel
- [ ] Cliente HTTP actualizado en frontend
- [ ] `vercel.json` creado
- [ ] Primer deploy completado y testeado

---

## 🧪 Testing Post-Deploy

1. **Backend**: 
   ```bash
   curl https://tu-backend-railway.up.railway.app/api/health
   ```

2. **Frontend**: Abre `https://tu-frontend.vercel.app` en el navegador

3. **Conexión**: Intenta login o cualquier acción que use el backend

---

## 🆘 Troubleshooting

### El frontend no conecta con el backend
- Verifica CORS_ORIGINS en Railway
- Verifica VITE_API_BASE_URL en Vercel
- Asegúrate de que la URL no tenga trailing slash

### Error de base de datos en Railway
- Ve a Railway Dashboard → Logs
- Verifica que `DATABASE_URL` esté correctamente configurado
- Si es primera vez, puede tardar en inicializar

### Timeout en despliegue
- Railway tiene límite de 15 minutos para build
- Si tu Maven build tarda más, considera cachear dependencias

