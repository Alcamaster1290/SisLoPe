# Auditoria de flujos y Centro de Comando

Fecha: 2026-05-07

## Alcance revisado

- Render de flujos logisticos, estabilidad de animacion y estado vacio del Centro de Comando.
- Acceso desde Centro de Comando hacia ADEX Palletizer para definir una propuesta logistica.
- Sin cambios en `src/auth`, receptor handoff, credenciales ni flujo de autenticacion.

## Hallazgos sobre flujos

1. El mapa abre en modo `standard`, pero la capa de arcos (`flow-arcs`) solo se activa en modo `flows`.
   Esto puede hacer que el usuario vea corredores y estelas, pero no los arcos completos esperados hasta cambiar a "Flujos".

2. Los controles de `Flujos` y `Corredores` quedaron dentro de "Mas controles".
   Si un usuario desactiva una de estas capas, el estado visual queda menos obvio porque el control no siempre esta visible en la barra principal.

3. La animacion usaba un reloj global de 520 ms mientras cada flujo tenia timestamps con duracion dependiente de distancia entre 160 y 520 ms.
   Resultado: los trayectos cortos desaparecian durante buena parte del ciclo y se percibian como flujos incompletos o intermitentes.

4. El reloj de `TripsLayer` podia superar el rango de timestamps por los multiplicadores de pulso del modo/zoom.
   Resultado: incluso rutas con timestamps largos podian quedar fuera del ciclo visible al final de cada loop.

## Cambios aplicados

- Se normalizo la duracion de timestamps de cada flujo con `FLOW_ANIMATION_CYCLE_MS`.
- Se modulo el `currentTime` de `TripsLayer` contra ese mismo ciclo para mantener las estelas dentro del rango visible.
- Se agrego cobertura de prueba para validar que los timestamps empiezan en `0` y terminan en el ciclo global.

## Centro de Comando

- Se agrego la opcion `Definir mi Propuesta Logistica` en el estado vacio del panel operativo.
- La opcion redirecciona a `VITE_ADEX_URL` y cae por defecto en `https://adex-palletizer.vercel.app`.

## Separacion de alcance

- El login guard propio de SisLoPe se conserva.
- No se modificaron archivos de autenticacion.
- El PR queda limitado a flujos del mapa, Centro de Comando, pruebas y esta auditoria.
