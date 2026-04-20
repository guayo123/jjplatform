# Deploy Rápido - Checklist

## 🎯 Antes de Empezar

Asegúrate de tener:
- ✅ Cuentas creadas en Railway.app y Vercel.com
- ✅ Repositorio GitHub actualizado
- ✅ Todos los cambios commiteados

---

## 🚄 1. Deploy del Backend en Railway (5 minutos)

### Paso 1: Crear Proyecto
```
1. Ir a https://railway.app/dashboard
2. Click "New Project" → "Deploy from GitHub"
3. Conectar GitHub y seleccionar repositorio
4. Railway detectará el Dockerfile automáticamente
```

### Paso 2: Configurar Base de Datos
```
1. En Railway Dashboard, click "New" → "Database" → "PostgreSQL"
2. Railway asignará automáticamente DATABASE_URL
```

### Paso 3: Agregar Variables (Railway Dashboard → Variables)
```
JWT_SECRET=tu-secreto-muy-seguro-32-caracteres-minimo!!!!
CORS_ORIGINS=https://tu-dominio-vercel.vercel.app
FILE_UPLOAD_DIR=/app/uploads
SPRING_PROFILES_ACTIVE=prod
```

**DATABASE_URL ya viene con PostgreSQL** - No necesitas agregarlo manualmente.

### Paso 4: Deploy
```
Railway hace auto-deploy cuando detecta cambios en GitHub
O fuerza manualmente en: Deployments → Redeploy
```

### Paso 5: Obtener URL
```
En Railway: Deployments → Click en tu deployment
Verás: https://jjplatform-prod-xxxxx.up.railway.app
COPIA ESTA URL → La necesitas para Vercel
```

---

## ⚡ 2. Deploy del Frontend en Vercel (5 minutos)

### Paso 1: Crear Proyecto
```
1. Ir a https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Importar tu repositorio GitHub
4. Seleccionar carpeta: frontend
```

### Paso 2: Configuración de Build
```
- Build Command: npm run build ✓ (autodetectado)
- Output Directory: dist ✓ (autodetectado)
- Install Command: npm install ✓ (autodetectado)
```

### Paso 3: Environment Variables
```
VITE_API_BASE_URL=https://jjplatform-prod-xxxxx.up.railway.app/api
(Reemplaza xxxxx con tu URL de Railway)
```

### Paso 4: Deploy
```
Click "Deploy"
Vercel hará build automáticamente
Verás: https://tu-proyecto.vercel.app cuando esté listo
```

---

## ✅ Testing Post-Deploy

### Test Backend
```bash
# Reemplaza tu URL de Railway
curl https://tu-backend-railway.up.railway.app/api/health

# Deberías ver respuesta del backend
```

### Test Frontend
- Abre en navegador: `https://tu-proyecto.vercel.app`
- Intenta hacer login u otra acción que use el backend
- Abre DevTools (F12) → Console para ver errores

### Si Algo Falla
```
Frontend no conecta:
- Ve a Vercel → Project Settings → Environment Variables
- Verifica que VITE_API_BASE_URL sea correcta
- Redeploy: Deployments → Click en latest → Redeploy

Backend error:
- Ve a Railway → Logs
- Busca mensajes de error
- Verifica DATABASE_URL y JWT_SECRET
```

---

## 🔄 Deploy Consecutivos (Actualizaciones)

### Backend
```
1. Haz cambios en code
2. Commit y push a GitHub: git push origin main
3. Railway detecta cambios automáticamente
4. Deploy completo en 2-3 minutos
```

### Frontend
```
1. Haz cambios en code
2. Commit y push a GitHub: git push origin main
3. Vercel detecta cambios automáticamente
4. Build y deploy en 1-2 minutos
```

---

## 🚨 Problemas Comunes y Soluciones

### Frontend muestra error de conexión
**Causa**: VITE_API_BASE_URL incorrecto
**Solución**:
1. Vercel → Project Settings → Environment Variables
2. Copia URL exacta de Railway (sin /api al final si ya lo tiene)
3. Redeploy

### Backend retorna error CORS
**Causa**: CORS_ORIGINS no configurado correctamente
**Solución**:
1. Railway → Variables
2. CORS_ORIGINS debe ser exactamente: `https://tu-proyecto.vercel.app`
3. Sin http://, sin path extra
4. Espera 2 minutos a que reinicie

### Database connection refused
**Causa**: DATABASE_URL no se cargó
**Solución**:
1. Railway → Base de datos PostgreSQL
2. Verifica que esté "Running" en azul
3. Copia DATABASE_URL completo
4. Pega en Railway Variables
5. Redeploy

### Build timeout en Railway
**Causa**: Maven tarda mucho descargando dependencias
**Solución**:
- Primera vez es normal (hasta 10 minutos)
- Llamadas posteriores son más rápidas (cache)
- Si sigue siendo lento, reduce dependencias

---

## 📝 URLs Útiles

- **Railway Dashboard**: https://railway.app/dashboard
- **Vercel Dashboard**: https://vercel.com/dashboard
- **GitHub**: https://github.com (tu repositorio)
- **Documentación Railway**: https://docs.railway.app
- **Documentación Vercel**: https://vercel.com/docs

---

## 💡 Tips Útiles

### Monitoreo
```
Railway: Dashboard → Click proyecto → Logs (en tiempo real)
Vercel: Dashboard → Projects → Click → Deployments → View Build Logs
```

### Rollback a versión anterior
```
Railway: Deployments → Selecciona deployment anterior → Redeploy
Vercel: Deployments → Click en un deployment anterior
```

### Ver variables en producción (no hagas esto con secretos)
```
Railway: Variables → puedes ver el valor
Vercel: ProjectSettings → Environment Variables → valores ocultos por seguridad
```

