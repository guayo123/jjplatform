# 🔐 Variables de Entorno & Secretos

## ⚠️ NUNCA hagas esto en producción

```
❌ Commitear archivos .env con secretos
❌ Poner secretos en el código
❌ Usar JWT_SECRET = "123456"
❌ Compartir URLs privadas de bases de datos
```

## ✅ Cómo Generar Secretos Seguros

### JWT_SECRET (256-bit)
```bash
# Opción 1: En Linux/Mac
openssl rand -base64 32

# Opción 2: En PowerShell (Windows)
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString() + [System.Guid]::NewGuid().ToString())) | Select-Object -First 1
```

**Cosa un JWT_SECRET de ejemplo seguro:**
```
eHN5bzNCVUhOMnZGaUh0aXd6TnoyK085aTZzSWN0YU1rTm9MRWw0eFk9
```

---

## 🔧 Variables en Railway

### Dashboard de Railway → Tu Proyecto → Variables

**1. DATABASE_URL** (Auto-generado por PostgreSQL)
```
postgresql://postgres:password@host:port/jjplatform
```
⚠️ **NO lo modifiques** - Railway lo inyecta automáticamente

**2. JWT_SECRET** (Genera uno seguro)
```
Tu_secreto_seguro_base64_de_32_caracteres
```

**3. CORS_ORIGINS** (Tu dominio Vercel)
```
https://tu-proyecto.vercel.app
```

**4. FILE_UPLOAD_DIR** (Directorio temporal)
```
/app/uploads
```

**5. SPRING_PROFILES_ACTIVE** (Modo producción)
```
prod
```

**6. PORT** (Opcional, Railway lo asigna automáticamente)
```
8081
```

---

## 🔧 Variables en Vercel

### Vercel Dashboard → Project → Settings → Environment Variables

**1. VITE_API_BASE_URL** (Tu backend de Railway)
```
https://tu-backend-railway.up.railway.app/api
```

⚠️ **IMPORTANTE**: 
- Sin trailing slash `/`
- HTTP o HTTPS según tu backend
- Sin rutas extras al final

---

## 📋 Checklist de Configuración

### Antes de Hacer Push a Producción

```
Backend (Java/Spring):
☐ application-prod.yml tiene ${DATABASE_URL}
☐ application-prod.yml tiene ${JWT_SECRET}
☐ application-prod.yml tiene ${CORS_ORIGINS}
☐ JWT_SECRET en Railway mide mínimo 32 caracteres
☐ CORS_ORIGINS es exacto: https://tu-vercel-app.vercel.app
☐ SPRING_PROFILES_ACTIVE = prod en Railway
☐ No hay secretos en código / .env files

Frontend (React/TypeScript):
☐ client.ts lee import.meta.env.VITE_API_BASE_URL
☐ VITE_API_BASE_URL en Vercel es correcto
☐ No hay hardcodeado "localhost:8081" en código
☐ package.json tiene "build" script correcto
```

---

## 🚀 Flujo de Deploy Seguro

### 1️⃣ Local (tu computadora)
```bash
# Test todo localmente
npm run dev          # Frontend
./mvnw spring-boot:run  # Backend

# Creas secretos locales en .env.local
VITE_API_BASE_URL=http://localhost:8081/api
```

### 2️⃣ GitHub (repositorio)
```bash
git add .
git commit -m "feat: ready for production"
git push origin main

# ⚠️ .env.local NO se sube a GitHub
# (está en .gitignore)
```

### 3️⃣ Railway (backend)
```
Railway detecta el push
Descarga código
Crea JAR con Maven
Inyecta variables de entorno desde Dashboard
Inicia la app
```

### 4️⃣ Vercel (frontend)
```
Vercel detecta el push
Instala dependencias
Inyecta VITE_API_BASE_URL desde Dashboard
Build con npm run build
Publica los archivos estáticos
```

---

## ✅ Test Post-Deploy

### Test Backend
```bash
# 1. Verifica que esté running
curl https://tu-backend-railway.up.railway.app/api/health

# 2. Test login (sin token)
curl -X POST https://tu-backend-railway.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# 3. Verifica CORS (desde navegador en Vercel)
# Abre DevTools F12 → Console
# Intenta hacer un request desde tu frontend
```

### Test Frontend
```
1. Abre https://tu-proyecto.vercel.app
2. Abre DevTools (F12) → Console
3. No debe haber errores de CORS
4. Intenta hacer login
5. Mira Network tab para ver requests al backend
```

---

## 🔍 Debug Variables

### ¿Cómo verificar qué variables leyó la app?

**Railway (Backend)**:
```
Railway Dashboard → Logs
Busca logs de Spring Boot inicializando
Verás: "app.jwt.secret: ****" (oculto por seguridad)
```

**Vercel (Frontend)**:
```
Vercel Dashboard → Deployments → View Build Logs
O en el navegador con DevTools:

  console.log(import.meta.env.VITE_API_BASE_URL)
```

---

## 🛡️ Mejores Prácticas

### Rotación de Secretos
```
Cada 3 meses:
1. Genera un nuevo JWT_SECRET
2. Lo actualizas en Railway
3. Redeploy backend
4. Los tokens viejos se invalidarán (normal)
5. Usuarios harán login nuevamente
```

### Monitoreo
```
Configura alertas en Railway para:
- Deploy failures
- Memory spikes
- Database errors

Configura alertas en Vercel para:
- Failed builds
- Function timeouts
```

### Backups
```
Railway PostgreSQL:
- Auto-backups cada noche
- Puedes restaurar desde Dashboard

Para backup manual:
pg_dump postgresql://host:port/dbname > backup.sql
```

---

## 🚨 Emergencia: Cambiar Secretos

Si accidentalmente commiteaste un secreto:

### Opción 1: Cambiar en Railways (Rápido)
```
1. Railway Dashboard → Variable
2. ACTUALIZAR JWT_SECRET con uno nuevo
3. Redeploy
4. Listo - los viejos tokens ya no sirven
```

### Opción 2: Cambiar en GitHub (Seguro)
```
1. git log --follow -p -- archivo-con-secreto
2. Usa BFG Repo-Cleaner para remover de histórico
3. Force push (peligroso, solo si es crítico)
```

---

## 📚 Referencias

- [Railway Docs - Environment Variables](https://docs.railway.app/develop/variables)
- [Vercel Docs - Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Spring Security - External Configuration](https://docs.spring.io/spring-boot/docs/current/reference/html/application-properties.html)
- [OWASP - Secrets Management](https://owasp.org/www-community/attacks/Sensitive_Data_Exposure)

