# MODO CAOS 🎮

Plataforma de minijuegos y torneos en realidad aumentada.

> **Estado (24/10/2026):** importados y verificados por SHA1 **los 23 archivos completos del arcade en producción**. La versión original continúa en su proyecto Vercel; el nuevo proyecto `modo-caos` está conectado a GitHub para desarrollos y pruebas. **No migrar el dominio anterior hasta verificar la copia en dispositivos reales.**

## Dónde está el arcade

- Web de producción: https://color-rush-ar-demo.vercel.app/
- Proyecto Vercel existente: `color-rush-ar-demo` (`prj_uZe3OiOzgj2iCkr39YvweIyDOuWl`)
- GitHub central: `ProtectorRudo/Modo-caos`
- Base temporal utilizada previamente: Supabase `viralio` (`bwsgxpttnrctklrcjmjs`). **No modificar ese proyecto al preparar Modo Caos.**
- Supabase dedicado a Modo Caos: **pendiente de aprobación del propietario, región y costo**.

## Juegos ya publicados

| Juego | Página | Módulos principales |
|---|---|---|
| Color Rush | /color.html | /engine.js, /color-solo.html, /color-duel.html, /color-duel.js |
| Ball Rush | /ball.html | /ball-art-v25.js, /ball-runtime-v25.js, /ball-physics-v25.js |
| Territorio X | /territorio.html | /territory-core.js, /territory-art.js, /territory-runtime.js |
| Muro Rush | /muro.html | /muro-core.js, /muro-art.js, /muro-runtime.js |

> **Verificado:** las rutas de los juegos también están ahora en la raíz de GitHub. Importadas desde Vercel deployment `dpl_EZksuDm5Y3gtUoafnDZ2GyjXWc7n`, con cada SHA1 coincidente.

## Próximos juegos

1. Semáforo Traicionero
2. Lluvia de Meteoros
3. No Mires Atrás
4. Memoria Mortal
5. Robo de Corona
6. Imán Loco
7. Cajas Tramposas
8. Desactivá o Explotá

## Estándar técnico

Consultar [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md). Base: HTML/CSS/JavaScript, WebXR immersive-ar con Chrome Android + ARCore, Hit Test y pista anclada, módulos de lógica/arte/runtime y Supabase Realtime para salas multijugador.

## Antes de publicar en producción

1. [LISTO] Recuperar los 23 archivos del despliegue original y verificar cada SHA1.
2. Evitar secretos en GitHub o en JavaScript del cliente.
3. Probar entradas AR, anclaje, calibración, física, tiempo, colisiones, reinicio y multijugador en distintos teléfonos.
4. [LISTO] `main` conectado al proyecto Vercel `modo-caos` (`prj_3irMVa8fdbifSh1mvWA67NcDGn1n`); el dominio anterior sigue aislado.
5. Configurar Supabase exclusivo con RLS y políticas de seguridad.
6. Promover al dominio público **solo después de validar**.

### Arquitectura de nombres

`/nombre.html` (pantalla), `/nombre-core.js` (reglas), `/nombre-art.js` (gráficos), `/nombre-runtime.js` (controles AR). No acoplar el cronómetro al renderizado.

**Seguridad:** no subir tokens privados, API service-role, contraseñas ni archivos `.env`. Las claves públicas que se usan en el navegador no otorgan por sí solas acceso privilegiado, pero siempre requieren RLS en Supabase.
