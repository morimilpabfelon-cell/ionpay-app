# n8n local + OpenAI para ionPAY

Esta guía prepara una conexión local entre n8n y OpenAI para probar el agente **ionPAY Agent Orchestrator & Memory Manager**. No habilita operaciones financieras, no conecta dinero real y no autoriza escrituras en GitHub, Notion ni en la aplicación.

## Requisitos

- n8n ejecutándose localmente, normalmente en `http://localhost:5678`.
- Una cuenta de OpenAI con acceso a la API.
- Una API key creada por el usuario directamente en la plataforma de OpenAI.

La API key real es un secreto. No debe compartirse por chat, pegarse en documentación, guardarse en el repositorio ni incluirse en un workflow exportado.

## Crear la credencial en n8n

1. Abre n8n local en `http://localhost:5678`.
2. Entra en **Credentials**.
3. Selecciona **Create Credential** o **Add credential**.
4. Busca la credencial **OpenAI**.
5. Usa este nombre recomendado:

   ```text
   OpenAI - ionPAY Local
   ```

6. Pega la API key directamente en el campo secreto de la credencial de n8n.
7. Guarda la credencial.
8. Abre el nodo **OpenAI Chat Model** del workflow y selecciona manualmente `OpenAI - ionPAY Local`.

La key debe permanecer únicamente dentro del almacén de credenciales de n8n. El workflow de referencia no contiene un ID de credencial ni una API key.

## Archivos de entorno

El archivo `.env.example` del repositorio solo contiene placeholders seguros:

```env
OPENAI_API_KEY=your_openai_api_key_here
N8N_HOST=localhost
N8N_PORT=5678
```

No reemplaces el placeholder con una key real dentro de `.env.example`. Si una instalación local necesita variables de entorno, usa un archivo `.env` local ignorado por Git y aplica además los controles de secretos de tu entorno. Para este workflow se recomienda guardar la key exclusivamente como credential de n8n.

## Reglas de seguridad

- Nunca subas una API key a GitHub.
- Nunca incluyas credenciales en un JSON exportado desde n8n.
- Revisa los workflows exportados antes de compartirlos.
- No pegues una key real en nodos **Set**, **Code**, prompts, notas o campos visibles.
- No registres headers de autorización ni respuestas que puedan contener secretos.
- Mantén el workflow desactivado mientras realizas la prueba manual.
- Limita el agente a clasificación y enrutamiento; esta prueba no debe escribir en sistemas externos.

Si una API key se filtra o existe sospecha de exposición, revócala inmediatamente en OpenAI, crea una key nueva y reemplázala únicamente dentro de la credencial local de n8n.

## Comprobación segura

Antes de ejecutar el workflow:

1. Confirma que el nodo OpenAI referencia `OpenAI - ionPAY Local` desde el selector de credenciales.
2. Confirma que ningún nodo contiene la key como texto.
3. Mantén el workflow en modo manual e inactivo.
4. Ejecuta una sola prueba desde **Manual Trigger**.
5. Comprueba que la salida sea únicamente una clasificación JSON y que no se hayan realizado escrituras externas.

También puedes validar los archivos de soporte sin contactar servicios externos:

```bash
node scripts/validate-n8n-workflow.mjs
```

El script solo lee archivos locales. No contacta OpenAI, n8n, GitHub, Notion ni Figma.
