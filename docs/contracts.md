# Contratos de Integracion - SisLoPe

Este modulo **consume** `trade-case.v1` y en una fase posterior `trade-costs.v1`.

## trade-case.v1 (Consumidor)

Archivo JSON que describe un caso comercial. SisLoPe lo usa para contextualizar la red logistica.

**Campos utilizados:**
- `caseId` — Referencia del caso activo
- `operationType` — Filtra nodos por tipo de operacion soportada (import/export)
- `originCountry`, `destinationCountry` — Prioriza corredores y rutas relevantes
- `modePreference` — Filtra por modalidad (maritimo, aereo, terrestre, multimodal)
- `skus[].weightKg` — Para recomendaciones de capacidad y modo de transporte
- `containerSummary.containerType` — Para filtrar terminales que soportan el tipo de contenedor
- `containerSummary.totalLoadWeightKg` — Para alertas de capacidad en nodos

**Campos no utilizados directamente:**
- `skus[].fobUnitPrice` — Dato financiero, no logistico
- `palletSummary` — Informativo, mostrado como contexto

## trade-costs.v1 (Consumidor futuro)

En fase posterior, SisLoPe consumira trade-costs.v1 para:
- Mostrar el impacto de costos por corredor/nodo seleccionado
- Comparar costos entre rutas alternativas
- Alertar sobre sobrecostos por eleccion de nodo

**Schema:** Ver `contracts/trade-costs.v1.schema.json` en la raiz del workspace.

## Regla operativa

Toda integracion entre modulos pasa por `caseId` y contratos versionados.
