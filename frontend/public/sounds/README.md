# Sonidos del portal

`oss3.mp3` es el cue que suena al registrar un entreno o subir de grado/cinturón.

Para cambiarlo: deja tu archivo aquí y actualiza la ruta en
`src/native/sound.ts` (la línea `new Audio('/sounds/oss3.mp3')`).

Si el archivo falta o el navegador bloquea el audio, la app reproduce un "thunk"
sintetizado como fallback. El usuario activa/desactiva el sonido en Ajustes → Sonidos.

> Nota: el audio requiere un gesto del usuario; el cue se dispara al tocar "Guardar".
