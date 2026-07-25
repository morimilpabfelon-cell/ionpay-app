# n8n Notion logging seguro para ionPAY

Esta guía prepara una prueba local y controlada para registrar una salida del Orchestrator bajo **ionPAY Agent Operating System**. Codex no configura credenciales reales, no ejecuta la escritura y no modifica Notion.

## Límite de escritura

Destino permitido:

```text
ionPAY Agent Operating System / 06_Context Packets
```

Destino alternativo permitido:

```text
ionPAY Agent Operating System / 02_Task Pipeline
```

No selecciones documentación de producto original, incluyendo:

- `IONPAY V1 - Restaurado`
- `IONPAY V1`
- `Folder ionPAY`
- `IONPAY Resumen ejecutivo`
- `Pitch Deck IONPAY`

## Seguridad de la credencial

1. Crea la integración de Notion fuera del repositorio.
2. Comparte con esa integración únicamente el destino permitido dentro de `ionPAY Agent Operating System`.
3. Crea o selecciona la credential manualmente desde n8n.
4. Nunca pegues el token en JSON, documentación, nodos Set, `.env.example` o GitHub.
5. No exportes IDs de credentials al repositorio.

## Importar y configurar

1. Importa `n8n/workflows/orchestrator-notion-logging-test.json`.
2. Confirma que el workflow está inactivo.
3. Abre **OpenAI Direct Chat** y selecciona manualmente `OpenAI - ionPAY Local`.
4. Abre **Notion Append Test Log**. El nodo viene deshabilitado, sin credential y con destino vacío.
5. Selecciona manualmente tu credential local de Notion.
6. Selecciona exclusivamente `ionPAY Agent Operating System / 06_Context Packets` o `02_Task Pipeline`.
7. Revisa el contenido del bloque antes de habilitar el nodo.
8. Habilita solo el nodo Notion; no actives el workflow completo.
9. Ejecuta **Manual Trigger** una vez.
10. Confirma que apareció un único registro pequeño en el destino permitido.

Si el selector de Notion no muestra el destino, no amplíes acceso a todo el workspace. Revisa manualmente que la integración esté conectada únicamente a la página permitida.

## Registro de prueba

El workflow prepara estos campos:

- `timestamp`
- `source: n8n-local-test`
- `workflow: ionPAY - Orchestrator Notion Logging Test`
- `prioridad`
- `riesgo`
- `estado_actual`
- `siguiente_agente`
- `revisores_posteriores`
- `puede_llegar_a_codex`
- `raw_output`

Para la prueba financiera, `puede_llegar_a_codex` debe permanecer en `false`.

## Compatibilidad local

La versión del nodo Notion puede variar entre instalaciones de n8n. Si el nodo importado aparece incompatible, elimínalo y crea manualmente un nodo **Notion → Append Block** equivalente. Mantén el destino vacío hasta seleccionarlo desde la interfaz y no copies credentials al JSON versionado.

No hagas commit ni push hasta confirmar localmente que la escritura ocurrió una sola vez y únicamente bajo `ionPAY Agent Operating System`.
