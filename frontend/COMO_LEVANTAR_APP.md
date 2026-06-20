# Cómo levantar la app con los cambios nuevos

Guía rápida para ver los cambios del portal (React/Vite) tanto en el navegador como en el
emulador Android (Capacitor). Pensada para Windows + PowerShell.

---

## ⚡ Regla de oro (Android): el JDK

Capacitor 8 **exige Java 21** para compilar Android. En esta máquina:

- La línea de comandos (`java -version`) y el `JAVA_HOME` global son **JDK 17** (se usan para Maven).
- El JBR de Android Studio **sí es JDK 21**: `C:\Program Files\Android\Android Studio\jbr`.

Si Gradle corre con el 17, el build falla con:

```
error: invalid source release: 21
```

**Por eso, antes de cualquier build de Android desde la terminal, fija el JDK 21 en esa sesión:**

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
```

> En Android Studio el equivalente es: `Settings → Build, Execution, Deployment → Build Tools →
> Gradle → Gradle JDK = jbr-21`. Ese ajuste del IDE sobreescribe todo lo demás.

---

## Opción A — Navegador (lo más rápido para revisar UI)

Hot reload instantáneo, no necesita Java ni emulador.

```powershell
cd C:\projects\jjplatform\frontend
npm run dev
```

Abre http://localhost:5173, inicia sesión como alumno y entra a la pestaña **Entreno**.

---

## Opción B — Emulador Android

> **Clave:** `npx cap run android` / `cap sync` **NO** ejecuta `npm run build`. Solo copia el
> `dist` que ya existe. Si no reconstruyes primero, el APK llevará la versión vieja del portal.

### Pasos (en orden)

```powershell
# 0. Fijar el JDK 21 en esta sesión (ver "Regla de oro")
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"

cd C:\projects\jjplatform\frontend

# 1. Compilar el portal web con los cambios nuevos
npm run build

# 2. Copiar el bundle web al proyecto Android nativo
npx cap sync android

# 3. Arrancar el EMULADOR primero y esperar a que bootee del todo
#    (ver "Arrancar el emulador" abajo). NO sigas hasta que esté en el home.

# 4. Compilar APK + instalar + lanzar
npx cap run android
```

### Dónde ver los cambios

Tras iniciar sesión, ve a la pestaña **Entreno**:
- **Botones compartir / lápiz**: siempre visibles en la tarjeta de progreso (arriba a la derecha).
- **Banner de racha perdida**: solo aparece si tienes una racha rota dentro de la ventana de
  recuperación (`repairAvailable && lostStreak > 0`). Si ya entrenaste o expiró la ventana, no se muestra.

### Alternativa desde Android Studio

Si prefieres el IDE: corre los pasos 1 y 2 (`npm run build` + `npx cap sync android`) en la terminal,
y luego dale al botón ▶ **Run** en Android Studio. Él gestiona el emulador y el deploy.
**No mezcles** el botón Run de Studio con `npx cap run` en terminal a la vez: se pelean por el
daemon de Gradle y por adb.

---

## Arrancar el emulador

```powershell
# Listar AVDs disponibles
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -list-avds

# Arrancar el AVD (este AVD necesita -skin porque no trae uno)
Start-Process "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" `
  -ArgumentList '-avd','Pixel_3a_API_30_x86','-skin','1080x2220'

# Esperar a que termine de bootear
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" wait-for-device
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" shell getprop sys.boot_completed
# (debe devolver "1")
```

---

## Troubleshooting (problemas que ya nos pasaron)

### `error: invalid source release: 21`
El build usó JDK 17. Fija `JAVA_HOME` al jbr (ver "Regla de oro") o cambia el Gradle JDK en Studio.

### `Deploying app-debug.apk … failed! ERR_NON_ZERO_EXIT: Non-zero exit code from Emulator: 1`
El **build estuvo bien**; falló el *deploy*. Causas típicas:
1. **El emulador se cayó o aún no terminó de bootear.** Verifica que esté vivo y en el home:
   ```powershell
   Get-Process emulator,qemu-system-x86_64 -ErrorAction SilentlyContinue
   & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
   ```
   Si no aparece nada, vuelve a arrancarlo (ver "Arrancar el emulador").
2. **Dos servidores adb en conflicto** (el dispositivo aparece y desaparece). Reinícialo limpio:
   ```powershell
   $adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
   & $adb kill-server
   & $adb start-server
   & $adb devices
   ```

### Instalar y lanzar el APK a mano (sin `cap run`)
Útil cuando el build ya está hecho y solo falló el deploy:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb install -r "C:\projects\jjplatform\frontend\android\app\build\outputs\apk\debug\app-debug.apk"
& $adb shell monkey -p com.jjplatform.app -c android.intent.category.LAUNCHER 1
```

### Tomar una captura del emulador
PowerShell corrompe binarios con `>`. Guarda en el dispositivo y haz `pull`:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb shell screencap -p /sdcard/cap.png
& $adb pull /sdcard/cap.png "C:\projects\jjplatform\frontend\cap.png"
```

---

## Resumen de un vistazo

| Quiero… | Comando |
|---|---|
| Ver UI rápido | `npm run dev` → http://localhost:5173 |
| Build Android (terminal) | `$env:JAVA_HOME=jbr` → `npm run build` → `npx cap sync android` → `npx cap run android` |
| Build Android (Studio) | `npm run build` + `npx cap sync android`, luego ▶ Run |
| App muere al desplegar | Reinicia emulador + `adb kill-server`/`start-server`, reinstala APK |
