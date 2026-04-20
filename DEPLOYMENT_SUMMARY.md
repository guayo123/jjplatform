# 📊 Arquitectura de Deploy - JJPlatform

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRODUCCIÓN                              │
├──────────────────────────────┬──────────────────────────────────┤
│                              │                                  │
│      RAILWAY (Backend)       │      VERCEL (Frontend)          │
│    ┌─────────────────┐       │   ┌──────────────────┐          │
│    │  Java/Spring    │       │   │  React/TypeScript│          │
│    │  Port 8081      │       │   │  Next.js Ready   │          │
│    │  PostgreSQL DB  │       │   │  CDN Global      │          │
│    └────────┬────────┘       │   └────────┬─────────┘          │
│             │                │            │                    │
│     https://jjplatform-     │     https://jjproject.          │
│     prod-xxx.up.railway.app │     vercel.app                  │
│                              │                                  │
└──────────────────────────────┴──────────────────────────────────┘
         ↑                                  ↑
         └──────────────────┬───────────────┘
                  Git Push (main branch)
                            ↑
        ┌───────────────────┴─────────────────┐
        │           GitHub                    │
        │      (tu-repo/jjplatform)          │
        │                                     │
        │    → backend/  (Spring Boot)       │
        │    → frontend/ (React + Vite)      │
        │    → DEPLOYMENT_GUIDE.md           │
        │    → QUICK_DEPLOY.md               │
        │    → SECRETS_AND_VARS.md           │
        └─────────────────────────────────────┘
```

---

## 🔄 Flujo de Actualización

```
Local Dev                GitHub             Railway              Vercel
    │                      │                   │                   │
    ├─ code changes ──────►│                   │                   │
    │                      │                   │                   │
    ├─ git push ──────────►│                   │                   │
    │                      │                   │                   │
    │                      ├─ webhook ────────►│                   │
    │                      │                   ├─ build (2-3 min)  │
    │                      │                   ├─ test             │
    │                      │                   ├─ deploy ──────────►
    │                      │                   │                   ├─ build (1-2 min)
    │                      │                   │                   ├─ deploy
    │                      │                   │                   ├─ ready
    │                      │                   │                   │
    └──────────────────────┴───────────────────┴───────────────────┘
                        (5-10 minutos total)
```

---

## ✅ Pre-Deploy Checklist

### Code Changes
```
☐ Todos los cambios commiteados
☐ No hay archivos .env con secretos en commit
☐ No hay hardcoded localhost o IPs
☐ Frontend usa import.meta.env.VITE_API_BASE_URL
☐ Backend usa ${} para variables de entorno
```

### Backend Preparation
```
☐ application-prod.yml tiene todas las variables
☐ DATABASE_URL configurado en Railway
☐ JWT_SECRET generado (32+ caracteres)
☐ CORS_ORIGINS son exactamente el dominio Vercel
☐ SPRING_PROFILES_ACTIVE = prod
☐ Dockerfile presente y correcto
```

### Frontend Preparation
```
☐ package.json tiene scripts correctos
  - "build": "tsc && vite build" ✓
  - "dev": "vite" ✓
☐ vercel.json presente con config
☐ .vercelignore creado
☐ VITE_API_BASE_URL en Vercel apunta a Railway
☐ No hay localhost:8081 hardcodeado
```

### Infrastructure
```
☐ Cuenta Railway activa y verificada
☐ Cuenta Vercel activa y verificada
☐ GitHub conectado a ambas plataformas
☐ Repositorio sincronizado
```

---

## 🚀 Deploy Step by Step

### 1. Subir de Local a GitHub
```bash
# Desde tu carpeta del proyecto
git status                           # Ver cambios
git add -A                          # Agregar todo
git commit -m "Deploy production"   # Commit
git push origin main                # Push a GitHub
```

### 2. Deploy Backend en Railway (5 minutos)

```bash
# En Railway Dashboard:

1. New Project → Deploy from GitHub
2. Seleccionar repositorio jjplatform
3. Esperar que Railway detecte el Dockerfile
4. New Database → PostgreSQL
5. Variables (Dashboard → Variables):
   DATABASE_URL    = (auto)
   JWT_SECRET      = tu-secreto-seguro
   CORS_ORIGINS    = https://tu-app.vercel.app
   FILE_UPLOAD_DIR = /app/uploads
   SPRING_PROFILES_ACTIVE = prod

6. Esperar build y deployment
7. Copiar URL: https://jjplatform-prod-xxx.up.railway.app
```

### 3. Deploy Frontend en Vercel (5 minutos)

```bash
# En Vercel Dashboard:

1. Add New → Project
2. Importar repositorio GitHub
3. Framework Preset: Vite
4. Root Directory: frontend
5. Build Command: npm run build (autodetectado ✓)
6. Environment Variables:
   VITE_API_BASE_URL = https://jjplatform-prod-xxx.up.railway.app/api

7. Click Deploy
8. Esperar build
9. Acceder: https://tu-proyecto.vercel.app
```

---

## 🧪 Validación Post-Deploy

### Test 1: Backend Health
```bash
curl https://tu-backend-railway.up.railway.app/api/health
# Esperado: 200 OK
```

### Test 2: Frontend Load
```
1. Abre https://tu-app.vercel.app en navegador
2. Abre DevTools (F12)
3. Console no debe tener errores de CORS
4. Network debe mostrar requests a Railway
```

### Test 3: Autenticación
```
1. Login con credenciales válidas
2. Verifica que se vea JWT token en localStorage
3. Intenta acceder a página protegida
4. Si funciona → ✅ Todo bien
```

### Test 4: CORS Validation
```javascript
// En DevTools Console
fetch('https://tu-railway.up.railway.app/api/health')
  .then(r => r.json())
  .then(d => console.log('Success:', d))
  .catch(e => console.error('Error:', e))
```

---

## 🆘 Troubleshooting Rápido

### Problema: 404 en frontend
```
❌ Vercel no encontró el código
✅ Solución: Verificar que Root Directory = frontend
```

### Problema: CORS error en console
```
❌ CORS_ORIGINS en Railway incorrecto
✅ Solución: 
   1. Railway → Variables
   2. CORS_ORIGINS = https://tu-vercel.vercel.app (exacto)
   3. Redeploy
   4. Esperar 1-2 minutos
```

### Problema: Database connection error en Railway
```
❌ DATABASE_URL no configurado
✅ Solución:
   1. Railway → PostgreSQL debe estar Running (azul)
   2. Verificar DATABASE_URL en Variables
   3. Redeploy
```

### Problema: Build timeout en Railway
```
❌ Maven tarda mucho (primera vez es normal)
✅ Solución:
   1. Aumentar timeout en Railway (si es posible)
   2. Segunda vez es más rápida (cache)
   3. Considerar multi-stage Dockerfile (ya lo tienes ✓)
```

---

## 📈 Después del Primer Deploy

### Daily Operations
```
✅ Frontend Deploy automático con git push (Vercel)
✅ Backend Deploy automático con git push (Railway)
✅ Database backups automáticos (Railway)
```

### Monitoreo
```
Railway: Dashboard → Logs (actualización en tiempo real)
Vercel:  Dashboard → Analytics (performance)
```

### Actualizaciones Futuras
```
1. Cambias código localmente
2. Haces: git push origin main
3. Railway redeploy (2-3 min)
4. Vercel redeploy (1-2 min)
5. Listo, usuarios ven cambios
```

---

## 🔒 Security Checklist

```
☐ HTTPS activo en ambas plataformas (automático)
☐ CORS restrictivo (solo tu dominio, no *)
☐ JWT_SECRET actualizado cada 3 meses
☐ DATABASE_URL nunca en logs públicos
☐ No hay credenciales en código
☐ CORS_ORIGINS es dominio, no localhost
```

---

## 📞 Support & Docs

- **Railway Help**: https://railway.app/help
- **Vercel Help**: https://vercel.com/support
- **Spring Boot**: https://spring.io/projects/spring-boot
- **Vite**: https://vitejs.dev/

