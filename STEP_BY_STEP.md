# 🎬 Tutorial Paso a Paso - Deploy JJPlatform

## 📍 Índice Rápido
1. [Preparación Local](#preparación-local)
2. [Crear Proyecto Railway](#crear-proyecto-railway)
3. [Configurar Backend](#configurar-backend)
4. [Crear Proyecto Vercel](#crear-proyecto-vercel)
5. [Configurar Frontend](#configurar-frontend)
6. [Testing Final](#testing-final)

---

## 🔧 Preparación Local

### Paso 1.1: Generar JWT_SECRET

**En PowerShell (Windows):**
```powershell
$jwt = -join ([char[]]('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=' | Get-Random -Count 44))
$jwt
```

**En Terminal (Mac/Linux):**
```bash
openssl rand -base64 32
```

**Resultado esperado:**
```
eHN5bzNCVUhOMnZGaUh0aXd6TnoyK281aTZzSWN0YU1rTm9MRWw0eFk9
```
📌 **Copia este valor - lo necesitarás**

### Paso 1.2: Verificar que todo esté en GitHub

```bash
# Desde la carpeta del proyecto
git status
# Debería estar limpio (sin cambios sin commitear)

# Si hay cambios:
git add -A
git commit -m "Ready for production deploy"
git push origin main
```

---

## 🚀 Crear Proyecto Railway

### Paso 2.1: Accede a Railway

1. Abre https://railway.app
2. Haz click en tu foto de perfil → **Dashboard**
3. Haz click en **"New Project"**

### Paso 2.2: Conectar GitHub

1. Selecciona **"Deploy from GitHub"**
2. Se abrirá ventana de autorización de GitHub
3. Haz click en **"Authorize"**
4. Selecciona tu repositorio `jjplatform`
5. Railway automáticamente detectará el `Dockerfile`

### Paso 2.3: Crear PostgreSQL

1. En el dashboard del proyecto, haz click en **"+ New"**
2. Selecciona **"Database"**
3. Selecciona **"PostgreSQL"**
4. Espera 1-2 minutos a que esté listo (verás círculo azul)

### Paso 2.4: Variables de Entorno

1. En el dashboard, haz click en **"Variables"** (esquina superior)
2. Verás `DATABASE_URL` ya configurado (no lo modifiques)
3. Haz click en **"New Variable"** y agrega:

```
Nombre: JWT_SECRET
Valor: (pega el JWT_SECRET que generaste en Paso 1.1)
```

4. Click **"New Variable"** nuevamente y agrega:

```
Nombre: CORS_ORIGINS
Valor: https://tu-proyecto.vercel.app
(Lo cambiarás después cuando sepas tu URL de Vercel)
```

5. Click **"New Variable"** y agrega:

```
Nombre: FILE_UPLOAD_DIR
Valor: /app/uploads
```

6. Click **"New Variable"** y agrega:

```
Nombre: SPRING_PROFILES_ACTIVE
Valor: prod
```

### Paso 2.5: Esperar Deploy

1. En **"Deployments"**, verás el deploy en progreso
2. Espera hasta que muestre ✅ "Success" (2-5 minutos)
3. Cuando esté listo, haz click en el deployment

### Paso 2.6: Copiar URL del Backend

1. En la página del deployment, copiar donde dice:
   ```
   https://jjplatform-prod-xxxxxx.up.railway.app
   ```
2. 📌 **Guarda esta URL - la necesitarás para Vercel**

---

## ⚙️ Configurar Backend

### Paso 3.1: Verificar application-prod.yml ✓

Ya debería estar hecho, pero verifica que tenga:

```yaml
spring:
  datasource:
    url: ${DATABASE_URL}
    driver-class-name: org.postgresql.Driver
  
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false

server:
  servlet:
    context-path: /api

app:
  jwt:
    secret: ${JWT_SECRET}
  cors:
    allowed-origins: ${CORS_ORIGINS}
```

### Paso 3.2: Verificar CorsConfig.java ✓

Ya debería estar bien, but check:

```java
config.setAllowedOrigins(List.of(allowedOrigins.split(",")));
```

---

## 🎯 Crear Proyecto Vercel

### Paso 4.1: Acceder a Vercel

1. Abre https://vercel.com
2. Haz click en **"Dashboard"**
3. Haz click en **"Add New..."** → **"Project"**

### Paso 4.2: Importar GitHub

1. Selecciona **"Import Git Repository"**
2. Busca y selecciona `jjplatform`
3. Haz click en **"Import"**

### Paso 4.3: Configurar Proyecto

1. En la página de configuración:
   - **Project Name**: `jjplatform` (o tu preferencia)
   - **Framework Preset**: Debería detectar "Vite" automáticamente
   - **Root Directory**: Haz click en el selector y selecciona **`frontend`**

2. Build Settings (debería estar autodetectado):
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. Haz click **"Deploy"**

### Paso 4.4: Esperar Deploy Inicial

Vercel construirá el proyecto (1-2 minutos).
Verás al final: "Congratulations! Your project has been deployed"

### Paso 4.5: Copiar URL de Vercel

1. Verás algo como: `https://jjplatform.vercel.app`
2. 📌 **Copia esta URL**

---

## 📋 Configurar Frontend

### Paso 5.1: Agregar Variable de Entorno en Vercel

1. En Vercel Dashboard, go a **"Settings"**
2. Haz click en **"Environment Variables"**
3. Agrega una nueva variable:

```
Name:  VITE_API_BASE_URL
Value: https://tu-backend-railway.up.railway.app/api
```

(Reemplaza `tu-backend-railway...` con tu URL real)

### Paso 5.2: Actualizar CORS_ORIGINS en Railway

1. Ve a Railway Dashboard
2. Haz click en tu proyecto backend
3. **Variables** → CORS_ORIGINS
4. Cambia el valor a: `https://tu-proyecto.vercel.app`
5. Haz click en **"Save changes"**
6. Railway automáticamente hará redeploy (1-2 minutos)

### Paso 5.3: Redeploy Frontend en Vercel

1. En Vercel Dashboard, go a **"Deployments"**
2. Haz click en el deployment más reciente
3. Haz click en el botón **"Redeploy"** (arriba a la derecha)
4. Espera a que termine

---

## 🧪 Testing Final

### Test 1: ¿Backend está online?

En tu navegador, abre:
```
https://tu-backend-railway.up.railway.app/api/health
```

Deberías ver una respuesta JSON (o error si no tienes endpoint health).

### Test 2: ¿Frontend carga?

Abre en tu navegador:
```
https://tu-proyecto.vercel.app
```

Deberías ver tu aplicación cargando.

### Test 3: ¿Frontend conecta con Backend?

1. Abre tu sitio en Vercel
2. Presiona **F12** para abrir DevTools
3. Ve a **Console**
4. Intenta hacer login u otra acción
5. Deberías ver:
   - Network requests al backend
   - NO debería haber errores CORS
   - La acción debería funcionar normalmente

### Test 4: ¿CORS está funcionando?

En DevTools Console, ejecuta:

```javascript
fetch('https://tu-backend-railway.up.railway.app/api/health', 
  { method: 'GET', headers: { 'Content-Type': 'application/json' } })
  .then(r => r.json())
  .then(d => console.log('✅ Success:', d))
  .catch(e => console.error('❌ Error:', e.message))
```

Deberías ver ✅ Success.

---

## ✅ Checklist Final

```
Deploy Completado:
☐ Backend running en Railway
☐ Frontend running en Vercel
☐ Base de datos PostgreSQL funcionando
☐ CORS configurado correctamente
☐ Variables de entorno inyectadas
☐ Tests de conexión exitosos
☐ Login funciona
☐ Requests al backend funcionan
```

---

## 📝 URLs de tu Proyecto

```
Backend:  https://tu-backend-railway.up.railway.app
Frontend: https://tu-proyecto.vercel.app
API Base: https://tu-backend-railway.up.railway.app/api
```

---

## 🔄 Para Próximos Deploys

Ahora que está configurado, cada vez que hagas cambios:

```bash
# Local
git add -A
git commit -m "Tu mensaje"
git push origin main

# Automáticamente:
# - Railway redeploy (2-3 min) ✓
# - Vercel redeploy (1-2 min) ✓
# - Tu aplicación actualizada
```

---

## 🆘 Si Algo Falla

### Frontend muestra "Cannot POST /api/..."
```
Problem: API base URL incorrecto
Solution: 
  1. Vercel Dashboard → Settings → Environment Variables
  2. VITE_API_BASE_URL es correcto?
  3. Redeploy Vercel
  4. Espera 2 minutos
```

### Error CORS en console
```
Problem: CORS_ORIGINS en Railway incorrecto
Solution:
  1. Railway → Backend Project → Variables
  2. CORS_ORIGINS = exactamente: https://tu-vercel.vercel.app
  3. Saves
  4. Espera redeploy (1-2 min)
  5. Refresh Vercel
```

### Database connection error
```
Problem: PostgreSQL no conecta
Solution:
  1. Railway → PostgreSQL database → Logs
  2. ¿Está Running? (debe ser círculo azul)
  3. Verifica DATABASE_URL en Variables
  4. Railway → Backend → Redeploy
```

---

**¡Listo! Tu aplicación está ahora en producción! 🎉**

