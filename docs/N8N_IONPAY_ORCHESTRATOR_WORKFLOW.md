# ionPAY - Orchestrator Intake Test

## Propósito

`ionPAY - Orchestrator Intake Test` es un workflow manual y local para probar la clasificación de tareas del agente **ionPAY Agent Orchestrator & Memory Manager**.

La prueba solo transforma una entrada estructurada en una recomendación de prioridad, área, riesgo y siguiente agente. No modifica código, Notion, GitHub, ledger, base de datos ni operaciones financieras.

## Flujo

El flujo principal tiene cuatro etapas:

1. **Manual Trigger**: inicia una ejecución controlada por el usuario.
2. **Set / Edit Fields**: crea el JSON de tarea de prueba.
3. **AI Agent**: clasifica la tarea usando un **OpenAI Chat Model** conectado como subnodo.
4. **Output**: conserva la respuesta para inspeccionarla en n8n.

El workflow de referencia incluye cinco nodos visuales porque n8n representa **OpenAI Chat Model** como un subnodo separado del **AI Agent**. Este subnodo no forma una quinta etapa del flujo principal.

## Entrada de prueba

El nodo **Set / Edit Fields** debe producir:

```json
{
  "source": "manual_test",
  "project": "ionPAY",
  "task": "Revisar si la corrección de transferencias atómicas pertenece a V1 y qué agente debe actuar primero.",
  "current_state": "V1 en construcción. Riesgo crítico: operaciones de dinero deben ser atómicas. Existe memoria operativa en Notion: ionPAY Agent Operating System.",
  "last_decision": "No agregar features nuevas. Priorizar ledger, pagos, wallet, seguridad, trazabilidad y pruebas.",
  "available_evidence": "Notion: ionPAY Agent Operating System creado. Notion: IONPAY V1 - Restaurado existe como fuente de lectura. GitHub: morimilpabfelon-cell/ionpay-app. Agentes existentes: Product Architect, Scope Guardian, R2 Scope Planner, UI/UX Designer, Frontend Surface Implementer, Frontend Surface Reviewer, Software Engineer, Financial Safety Reviewer, Operating Executor."
}
```

## Instrucción del agente

El agente debe:

- clasificar únicamente con la evidencia recibida;
- proteger el V1 Scope Lock;
- tratar cambios de dinero, saldos, ledger, wallet o pagos como riesgo crítico/R3;
- elegir primero al agente escritor apropiado;
- incluir después al Financial Safety Reviewer cuando exista riesgo financiero;
- no ejecutar acciones, escribir en sistemas externos ni presentar la clasificación como aprobación;
- devolver solamente JSON válido, sin Markdown ni texto adicional.

## Resultado esperado

```json
{
  "prioridad": "P1",
  "area": "ledger / pagos / backend",
  "riesgo": "crítico",
  "estado_actual": "Needs Engineering",
  "siguiente_agente": "ionPAY Software Engineer",
  "revisores_posteriores": ["ionPAY Financial Safety Reviewer"],
  "estado_notion": "Needs Engineering",
  "puede_llegar_a_codex": false
}
```

`puede_llegar_a_codex: false` indica que el orchestrator solo clasificó la tarea. La tarea todavía requiere revisión humana del alcance antes de convertirse en una instrucción ejecutable para Codex.

## Importar el workflow

1. Abre n8n local.
2. Selecciona **Import from File**.
3. Importa `n8n/workflows/orchestrator-intake-test.json`.
4. Abre **OpenAI Chat Model**.
5. Selecciona manualmente la credential `OpenAI - ionPAY Local`.
6. Selecciona un modelo disponible para tu cuenta y apropiado para salida JSON.
7. Revisa el prompt y confirma que el workflow no contiene acciones externas.
8. Guarda el workflow sin activarlo.
9. Ejecuta **Manual Trigger** y revisa el nodo **Output**.

## Fallback para `invalid syntax`

Si el nodo **ionPAY Orchestrator Agent** muestra:

```text
invalid syntax
```

usa el workflow simplificado:

```text
n8n/workflows/orchestrator-openai-simple-test.json
```

Este fallback elimina el **AI Agent** y usa un nodo OpenAI directo con un prompt fijo. Está diseñado para comprobar primero la conectividad entre n8n y OpenAI, sin expresiones dinámicas.

Para la primera prueba:

1. Importa `orchestrator-openai-simple-test.json`.
2. Abre el nodo **OpenAI Direct Chat**.
3. Selecciona manualmente la credential `OpenAI - ionPAY Local`.
4. Selecciona un modelo disponible en tu cuenta si n8n solicita actualizarlo.
5. Mantén el campo del prompt en modo **Fixed**, no **Expression**.
6. No agregues `=` al inicio del prompt.
7. No uses expresiones `{{ }}` hasta que la prueba con texto fijo funcione.
8. Mantén el workflow inactivo y ejecútalo únicamente con **Manual Trigger**.

La causa probable del error original es que el prompt del AI Agent fue importado en Expression mode y contiene una combinación de JavaScript, saltos de línea y JSON que la versión local de n8n no puede interpretar. No es una señal de que la API key sea incorrecta.

La salida del fallback debe mantener `puede_llegar_a_codex` en `false`. Si el modelo devuelve `true`, no continúes con automatizaciones: considera la prueba fallida y revisa el prompt.

## Calibración semántica obligatoria

Una ejecución puede confirmar conectividad con OpenAI y aun así fallar la calibración. La prueba falla si el modelo inventa agentes, usa prioridades como `Alta` en lugar de `P1` o devuelve estados fuera del catálogo ionPAY.

El workflow simplificado restringe los agentes a:

- `ionPAY Product Architect`
- `ionPAY Scope Guardian`
- `ionPAY R2 Scope Planner`
- `ionPAY UI/UX Designer`
- `ionPAY Frontend Surface Implementer`
- `ionPAY Frontend Surface Reviewer`
- `ionPAY Software Engineer`
- `ionPAY Financial Safety Reviewer`
- `ionPAY Operating Executor`
- `Codex`

No se permite inventar nombres de agentes o revisores.

Enums permitidos:

```text
prioridad: P0, P1, P2, P3, P4, P5
riesgo: normal, medio, crítico
estado: Inbox, Needs Product, Needs Scope, Needs R2 Review,
        Needs Engineering, Needs Financial Review, Needs UX,
        Needs Frontend Implementation, Needs Frontend Review,
        Ready for Execution, In Codex, Needs Review, Approved,
        Blocked, Rejected, Later
```

Las tareas que tocan ledger, wallet, saldo, pagos, auth o DB deben clasificarse como `P1` y riesgo `crítico`.

Para esta prueba, el resultado esperado completo es:

```json
{
  "veredicto": "requiere revisión técnica antes de ejecución",
  "prioridad": "P1",
  "area": "ledger / pagos / backend",
  "riesgo": "crítico",
  "estado_actual": "Needs Engineering",
  "siguiente_agente": "ionPAY Software Engineer",
  "revisores_posteriores": ["ionPAY Financial Safety Reviewer"],
  "estado_notion": "Needs Engineering",
  "puede_llegar_a_codex": false,
  "siguiente_paso": "Enviar la tarea al ionPAY Software Engineer para auditoría técnica y prompt de corrección; después exigir revisión de ionPAY Financial Safety Reviewer antes de Codex."
}
```

Después de actualizar el archivo, vuelve a importarlo o copia manualmente el prompt fijo actualizado al nodo **OpenAI Direct Chat** y ejecuta una sola vez. Si cualquier agente o enum queda fuera de las listas anteriores, la calibración sigue en FAIL.

## Compatibilidad con versiones de n8n

El JSON usa nombres de nodos habituales de n8n y no contiene credenciales. Las versiones de los nodos AI cambian entre releases de n8n. Si la instalación local muestra un nodo desconocido o una versión incompatible:

1. conserva **Manual Trigger** y **Set / Edit Fields**;
2. elimina únicamente el nodo AI incompatible;
3. agrega desde la interfaz un **AI Agent** y un **OpenAI Chat Model** compatibles con la versión local;
4. copia el system message documentado;
5. conecta el Chat Model al puerto `ai_languageModel` del AI Agent;
6. conecta el AI Agent al nodo **Output**;
7. selecciona manualmente la credential local.

No agregues IDs de credentials al JSON versionado. Después de exportar una variante local, revisa el archivo antes de compartirlo y elimina cualquier referencia a credenciales.

## Criterios de aceptación de la prueba

- La ejecución comienza solo mediante Manual Trigger.
- La entrada coincide con el JSON documentado.
- La respuesta contiene las ocho propiedades esperadas.
- La tarea se clasifica como `P1` y riesgo `crítico`.
- El primer agente es `ionPAY Software Engineer`.
- El revisor posterior incluye `ionPAY Financial Safety Reviewer`.
- No se realizan escrituras externas.
- No se muestran ni exportan secretos.

## Validación local sin red

Desde la raíz del repositorio ejecuta:

```bash
node scripts/validate-n8n-workflow.mjs
```

Este comando comprueba que el JSON existe y se puede interpretar, que el workflow está inactivo, que no incluye credentials ni secretos con formato de API key, que `.env` no existe y que `.env.example` conserva únicamente placeholders. No ejecuta el workflow ni realiza conexiones de red.
