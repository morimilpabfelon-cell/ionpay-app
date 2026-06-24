# Checklist local n8n para ionPAY

## Antes de ejecutar

- [ ] n8n abre en `http://localhost:5678`.
- [ ] El workflow está inactivo.
- [ ] La credential OpenAI se seleccionó manualmente.
- [ ] La credential Notion se seleccionó manualmente.
- [ ] Ningún token aparece como texto dentro de un nodo.
- [ ] El nodo Notion apunta solo a `ionPAY Agent Operating System / 06_Context Packets` o `02_Task Pipeline`.
- [ ] El nodo Notion no apunta a documentación original del producto.
- [ ] `puede_llegar_a_codex` es `false`.

## Ejecución única

1. Mantén el workflow inactivo.
2. Habilita **Notion Append Test Log** después de revisar credential y destino.
3. Presiona **Manual Trigger** una sola vez.
4. Abre **OpenAI Direct Chat → Output** y confirma la clasificación.
5. Abre **Prepare Notion Log Record → Output** y revisa los diez campos.
6. Confirma en Notion que se creó un único bloque bajo el destino permitido.

## Resultado esperado

- [ ] `prioridad` es `P1`.
- [ ] `riesgo` es `crítico`.
- [ ] `estado_actual` es `Needs Engineering`.
- [ ] `siguiente_agente` es `ionPAY Software Engineer`.
- [ ] `revisores_posteriores` contiene `ionPAY Financial Safety Reviewer`.
- [ ] `puede_llegar_a_codex` es `false`.
- [ ] No se escribió en ningún documento de producto original.

Si aparece más de un registro, un destino incorrecto o `puede_llegar_a_codex: true`, detén la prueba y no actives el workflow.
