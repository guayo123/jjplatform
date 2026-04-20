# 📚 Índice de Documentación - Deploy JJPlatform

## 🎯 ¿Por dónde empiezo?

**Si es la primera vez:**
→ Lee [STEP_BY_STEP.md](STEP_BY_STEP.md) (Tutorial paso a paso)

**Si ya conoces Railway/Vercel:**
→ Lee [QUICK_DEPLOY.md](QUICK_DEPLOY.md) (Checklist rápido)

**Para entender la seguridad:**
→ Lee [SECRETS_AND_VARS.md](SECRETS_AND_VARS.md) (Manejo de secretos)

---

## 📄 Archivos Creados / Modificados

### Root Directory (`/`)

#### 1. 🚀 **[STEP_BY_STEP.md](STEP_BY_STEP.md)**
   - **Para**: Principiantes o primera vez desplegando
   - **Contiene**: Tutorial ultra-detallado con screenshots mentales
   - **Secciones**:
     - Generar JWT_SECRET
     - Crear proyecto en Railway
     - Configurar PostgreSQL
     - Crear proyecto en Vercel
     - Configurar variables
     - Testing completo
   - ⏱️ **Tiempo**: 20-30 minutos
   - **Mejor para**: Tú, según lo que pides

#### 2. ⚡ **[QUICK_DEPLOY.md](QUICK_DEPLOY.md)**
   - **Para**: Ya sabes cómo funciona, necesitas checklist rápido
   - **Contiene**: Steps condensados con checkboxes
   - **Secciones**:
     - Checklist pre-deploy
     - Deploy rápido Railway (5 min)
     - Deploy rápido Vercel (5 min)
     - Testing
     - Problemas comunes
   - ⏱️ **Tiempo**: 5-10 minutos
   - **Mejor para**: Deploys posteriores

#### 3. 📊 **[DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md)**
   - **Para**: Entender la arquitectura y flujo actual
   - **Contiene**: Diagramas ASCII de arquitectura
   - **Secciones**:
     - Arquitectura de infraestructura
     - Flujo de actualización
     - Pre-deploy checklist
     - Step by step deploy
     - Troubleshooting diagrama
   - **Mejor para**: Entender cómo funciona todo junto

#### 4. 🔐 **[SECRETS_AND_VARS.md](SECRETS_AND_VARS.md)**
   - **Para**: Seguridad y manejo de variables de entorno
   - **Contiene**: Best practices de secretos
   - **Secciones**:
     - Cómo generar JWT_SECRET seguro
     - Qué variables agregar en Railway
     - Qué variables agregar en Vercel
     - Cómo manejar rotación de secretos
     - Qué hacer si accidentalmente hiciste commit de un secreto
   - **IMPORTANTE**: Lee esto si quieres que tu app sea segura

#### 5. 📖 **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**
   - **Para**: Guía completa y detallada
   - **Contiene**: Explicación profunda de cada paso
   - **Secciones**:
     - Backend en Railway (paso por paso)
     - Frontend en Vercel (paso por paso)
     - Troubleshooting extenso
     - Testing post-deploy

#### 6. 📋 **[INDEX.md](INDEX.md)** (Este archivo)
   - **Para**: Entender qué documentación existe y cuándo usarla

---

### Backend Directory (`/backend/`)

#### 7. 🐳 **railway.json** (NUEVO)
```json
{
  "build": { "builder": "dockerfile" },
  "deploy": { "startCommand": "java -jar app.jar" }
}
```
- **Para**: Decirle a Railway cómo buildear y ejecutar
- **Automático**: Railway lo detecta

#### 8. 📝 **application-prod.yml** (MODIFICADO)
```yaml
# Ahora utiliza variables de entorno para producción
spring:
  datasource:
    url: ${DATABASE_URL}  # ← Variable de Railway
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false
...
```
- **Para**: Configuración de producción
- **Usa**: Variables inyectadas por Railway
- **Cambio**: Ahora muestra-sql es false para producción

---

### Frontend Directory (`/frontend/`)

#### 9. 📝 **vercel.json** (NUEVO)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "env": {
    "VITE_API_BASE_URL": "@vite_api_base_url"
  },
  "rewrites": [ { "source": "/(.*)", "destination": "/index.html" } ]
}
```
- **Para**: Decirle a Vercel cómo buildear y configurar
- **Por**: React router requiere rewrite de todas las rutas a index.html

#### 10. ✅ **.vercelignore** (NUEVO)
```
node_modules
.git
.env.local
dist
```
- **Para**: Qué archivos ignorar en Vercel
- **Standard**: Ignora archivos temporales y locales

#### 11. 🔌 **src/api/client.ts** (MODIFICADO)
```typescript
// ANTES:
const client = axios.create({ baseURL: '/api' })

// DESPUÉS:
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api'
const client = axios.create({ baseURL: API_BASE_URL })
```
- **Para**: Usar URL del backend desde variable de entorno
- **Permite**: Funciona tanto en localhost como en producción

---

## 🗺️ Flujo de Lectura Recomendado

### 1️⃣ Primera Vez (Nuevo en Deploy)
```
1. Lee: STEP_BY_STEP.md (20 min)
   └─ Sigue cada paso como tutorial

2. Lee: SECRETS_AND_VARS.md (10 min)
   └─ Entiende la seguridad

3. Ejecuta: STEP_BY_STEP.md (15-20 min)
   └─ Deploy tu proyecto

4. Testing desde STEP_BY_STEP.md (5 min)
   └─ Verifica que todo funcione
```

### 2️⃣ Siguientes Deploys (Ya está configurado)
```
1. Haz cambios en código
2. Commit y push: git push origin main
3. Espera 5-10 minutos
4. Verifica en Railway y Vercel dashboards
5. Listo ✓
```

### 3️⃣ Si Algo Falla
```
1. Ve a QUICK_DEPLOY.md → sección "Problemas Comunes"
2. Si no está ahí, ve a DEPLOYMENT_GUIDE.md → sección "Troubleshooting"
3. Si aún no funciona, revisa SECRETS_AND_VARS.md
```

---

## 🎯 Referencia Rápida por Escenario

### Escenario: "Quiero empezar ahora mismo"
→ [STEP_BY_STEP.md](STEP_BY_STEP.md) - Paso 1 al 6

### Escenario: "Ya desplegué, ¿cómo actualizo?"
→ Section "Deploy Consecutivos" en [QUICK_DEPLOY.md](QUICK_DEPLOY.md)

### Escenario: "Mi deploy está roto"
→ [QUICK_DEPLOY.md](QUICK_DEPLOY.md) - "Problemas Comunes"
→ [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - "Troubleshooting"

### Escenario: "¿Dónde pongo los secretos?"
→ [SECRETS_AND_VARS.md](SECRETS_AND_VARS.md)

### Escenario: "¿Cómo es la arquitectura?"
→ [DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md) - Diagramas

### Escenario: "Quiero explicación detallada"
→ [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

---

## 📊 Summary de Cambios

### Archivos Creados
```
✅ STEP_BY_STEP.md           ← Tutorial detallado
✅ QUICK_DEPLOY.md          ← Checklist rápido  
✅ DEPLOYMENT_SUMMARY.md    ← Arquitectura
✅ SECRETS_AND_VARS.md      ← Seguridad
✅ DEPLOYMENT_GUIDE.md      ← Guía completa
✅ INDEX.md                 ← Este índice
✅ railway.json             ← Config Railway
✅ frontend/vercel.json     ← Config Vercel
✅ frontend/.vercelignore   ← Ignore list Vercel
```

### Archivos Modificados
```
🔧 backend/src/main/resources/application-prod.yml
   └─ Ahora con variables de entorno
   
🔧 frontend/src/api/client.ts
   └─ Ahora usa import.meta.env.VITE_API_BASE_URL
```

### Archivos Ya Presentes
```
✓ backend/Dockerfile       (Multi-stage Maven → Java)
✓ frontend/Dockerfile      (Multi-stage Node → Nginx)
✓ backend/pom.xml         (Dependencias Spring Boot)
✓ frontend/package.json   (Dependencias React/Vite)
✓ backend/src/main/java/com/jjplatform/api/config/CorsConfig.java
   └─ Ya configura CORS dinámicamente
✓ backend/src/main/java/com/jjplatform/api/config/SecurityConfig.java
   └─ Ya tiene seguridad JWT
```

---

## 💡 Tips Importantes

### Sobre Railway
- ✅ Detecta automáticamente Dockerfile
- ✅ Crea PostgreSQL automáticamente
- ✅ Inyecta variables en runtime
- ⚠️ DATABASE_URL es especial (no lo modifiques)
- ⚠️ Redeploy toma 2-3 minutos

### Sobre Vercel
- ✅ Detecta automáticamente Root Directory
- ✅ VITE_ variables se reemplazan en build time
- ⚠️ El build corre en servidor Vercel
- ⚠️ Frontend despliega a CDN global (rápido)
- ⚠️ Cambios en env variables requieren redeploy

### Sobre GitHub
- ✅ Ambos (Railway y Vercel) monitorean cambios
- ✅ Auto-deploy con cada push a main
- ⚠️ Nunca commits archivos .env con secretos
- ⚠️ Usa .gitignore para archivos sensibles

---

## 🔗 Enlaces Útiles

### Platforms
- 🚀 Railway: https://railway.app
- ⚡ Vercel: https://vercel.com
- 🐱 GitHub: https://github.com

### Documentation
- 📚 Railway Docs: https://docs.railway.app
- 📚 Vercel Docs: https://vercel.com/docs
- 📚 Spring Boot: https://spring.io
- 📚 Vite: https://vitejs.dev
- 📚 React: https://react.dev

### Seguridad
- 🔒 OWASP Secrets: https://owasp.org/www-community/attacks/Sensitive_Data_Exposure

---

## ❓ Preguntas Frecuentes

### P: ¿Puedo desplegar solo el frontend primero?
R: Sí, pero el frontend sin backend no funciona. Recomienda desplegar ambos.

### P: ¿El usuario verá downtime durante el deploy?
R: Vercel: NO (CDN cacheado). Railway: 30 seg a 1 min.

### P: ¿Cuánto cuesta?
R: Railway: $5 USD/mes (plan iniciación). Vercel: Gratis plan hobby (suficiente).

### P: ¿Los redeploys son automáticos?
R: Sí, con cada `git push origin main`.

### P: ¿Dónde veo los logs?
R: Railway: Dashboard → Logs. Vercel: Dashboard → Deployments → Logs.

### P: ¿Cómo cambio el dominio?
R: Vercel: Project → Settings → Domains. Railway: Es un subdominio de railway.app.

### P: ¿Backup de datos?
R: Railway PostgreSQL hace auto-backup. Para manual: herramientas psql.

---

## ✨ Resumen Final

Has recibido:

1. **6 guías de documentación**.
2. **3 archivos de configuración** (railway.json, vercel.json, .vercelignore).
3. **2 cambios en código** (application-prod.yml, client.ts).
4. **Todo listo para desplegar** en 20 minutos.

**Próximo paso**: 
- Abre [STEP_BY_STEP.md](STEP_BY_STEP.md)
- Sigue cada paso
- Tu app estará en producción en 30 minutos

**¡Mucho éxito! 🚀**

