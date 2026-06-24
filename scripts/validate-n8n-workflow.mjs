import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const workflowPath = join(repositoryRoot, 'n8n', 'workflows', 'orchestrator-intake-test.json')
const fallbackWorkflowPath = join(repositoryRoot, 'n8n', 'workflows', 'orchestrator-openai-simple-test.json')
const notionWorkflowPath = join(repositoryRoot, 'n8n', 'workflows', 'orchestrator-notion-logging-test.json')
const envPath = join(repositoryRoot, '.env')
const envExamplePath = join(repositoryRoot, '.env.example')
const setupDocPath = join(repositoryRoot, 'docs', 'N8N_OPENAI_SETUP.md')
const workflowDocPath = join(repositoryRoot, 'docs', 'N8N_IONPAY_ORCHESTRATOR_WORKFLOW.md')
const failures = []

function check(condition, message) {
  if (condition) {
    console.log(`PASS: ${message}`)
  } else {
    failures.push(message)
    console.error(`FAIL: ${message}`)
  }
}

function findUnsafeWorkflowValues(value, path = '$', findings = []) {
  if (typeof value === 'string') {
    if (/sk-[A-Za-z0-9_-]{12,}/.test(value)) findings.push(`${path} contiene una posible OpenAI API key`)
    if (/(?:secret|ntn)_[A-Za-z0-9_-]{12,}/.test(value)) findings.push(`${path} contiene un posible token de Notion`)
    if (/OPENAI_API_KEY\s*=\s*(?!your_openai_api_key_here\b)[^\s"']+/i.test(value)) {
      findings.push(`${path} contiene un valor OPENAI_API_KEY no permitido`)
    }
    return findings
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => findUnsafeWorkflowValues(item, `${path}[${index}]`, findings))
    return findings
  }

  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (key === 'credentials' && child && typeof child === 'object' && Object.keys(child).length > 0) {
        findings.push(`${path}.${key} contiene credentials embebidas`)
      }
      findUnsafeWorkflowValues(child, `${path}.${key}`, findings)
    }
  }

  return findings
}

function findSecretLikeText(content, label, findings = []) {
  if (/sk-[A-Za-z0-9_-]{12,}/.test(content)) findings.push(`${label} contiene una posible OpenAI API key`)
  if (/(?:secret|ntn)_[A-Za-z0-9_-]{12,}/.test(content)) findings.push(`${label} contiene un posible token de Notion`)
  if (/OPENAI_API_KEY\s*=\s*(?!your_openai_api_key_here\b)[^\s"'`]+/i.test(content)) {
    findings.push(`${label} contiene un valor OPENAI_API_KEY no permitido`)
  }
  return findings
}

check(existsSync(workflowPath), 'el workflow de referencia existe')

let workflow
if (existsSync(workflowPath)) {
  try {
    workflow = JSON.parse(readFileSync(workflowPath, 'utf8'))
    check(true, 'el workflow contiene JSON válido')
  } catch (error) {
    check(false, `el workflow contiene JSON válido (${error.message})`)
  }
}

if (workflow) {
  check(workflow.active === false, 'el workflow está inactivo por defecto')
  const findings = findUnsafeWorkflowValues(workflow)
  check(findings.length === 0, 'el workflow no contiene credentials ni secretos aparentes')
  for (const finding of findings) console.error(`  ${finding}`)
}

check(existsSync(fallbackWorkflowPath), 'el workflow fallback OpenAI directo existe')

let fallbackWorkflow
if (existsSync(fallbackWorkflowPath)) {
  try {
    fallbackWorkflow = JSON.parse(readFileSync(fallbackWorkflowPath, 'utf8'))
    check(true, 'el workflow fallback contiene JSON válido')
  } catch (error) {
    check(false, `el workflow fallback contiene JSON válido (${error.message})`)
  }
}

if (fallbackWorkflow) {
  check(fallbackWorkflow.active === false, 'el workflow fallback está inactivo por defecto')
  const findings = findUnsafeWorkflowValues(fallbackWorkflow)
  check(findings.length === 0, 'el workflow fallback no contiene credentials ni secretos aparentes')
  for (const finding of findings) console.error(`  ${finding}`)
  const fallbackTypes = fallbackWorkflow.nodes.map((node) => node.type)
  check(!fallbackTypes.includes('@n8n/n8n-nodes-langchain.agent'), 'el workflow fallback no utiliza AI Agent')
  const openAiNode = fallbackWorkflow.nodes.find((node) => node.name === 'OpenAI Direct Chat')
  const fixedPrompt = openAiNode?.parameters?.messages?.values?.[0]?.content
  check(typeof fixedPrompt === 'string' && !fixedPrompt.startsWith('=') && !fixedPrompt.includes('{{'), 'el prompt fallback usa texto fijo sin expresiones')
  const approvedAgents = [
    'ionPAY Product Architect',
    'ionPAY Scope Guardian',
    'ionPAY R2 Scope Planner',
    'ionPAY UI/UX Designer',
    'ionPAY Frontend Surface Implementer',
    'ionPAY Frontend Surface Reviewer',
    'ionPAY Software Engineer',
    'ionPAY Financial Safety Reviewer',
    'ionPAY Operating Executor',
    'Codex',
  ]
  check(approvedAgents.every((agent) => fixedPrompt?.includes(agent)), 'el prompt fallback contiene todos los agentes aprobados')
  check(fixedPrompt?.includes('P0, P1, P2, P3, P4, P5'), 'el prompt fallback restringe el enum de prioridad')
  check(fixedPrompt?.includes('normal, medio, crítico'), 'el prompt fallback restringe el enum de riesgo')
  check(fixedPrompt?.includes('Needs Engineering') && fixedPrompt?.includes('Ready for Execution'), 'el prompt fallback restringe los estados operativos')
  check(fixedPrompt?.includes('"prioridad": "P1"') && fixedPrompt?.includes('"riesgo": "crítico"'), 'el prompt fallback fija P1/crítico para la prueba financiera')
  check(fixedPrompt?.includes('"siguiente_agente": "ionPAY Software Engineer"'), 'el prompt fallback fija el agente escritor aprobado')
  check(fixedPrompt?.includes('"revisores_posteriores": ["ionPAY Financial Safety Reviewer"]'), 'el prompt fallback exige revisión financiera')
  check(fixedPrompt?.includes('"puede_llegar_a_codex": false'), 'el prompt fallback bloquea ejecución directa en Codex')
}

check(existsSync(notionWorkflowPath), 'el workflow de logging Notion existe')

let notionWorkflow
if (existsSync(notionWorkflowPath)) {
  try {
    notionWorkflow = JSON.parse(readFileSync(notionWorkflowPath, 'utf8'))
    check(true, 'el workflow de logging Notion contiene JSON válido')
  } catch (error) {
    check(false, `el workflow de logging Notion contiene JSON válido (${error.message})`)
  }
}

if (notionWorkflow) {
  check(notionWorkflow.active === false, 'el workflow de logging Notion está inactivo por defecto')
  const findings = findUnsafeWorkflowValues(notionWorkflow)
  check(findings.length === 0, 'el workflow de logging Notion no contiene credentials ni secretos aparentes')
  for (const finding of findings) console.error(`  ${finding}`)
  const nodeTypes = notionWorkflow.nodes.map((node) => node.type.toLowerCase())
  check(!nodeTypes.some((type) => type.includes('github') || type.includes('figma') || type.includes('codex')), 'el workflow de logging no contiene nodos GitHub, Figma o Codex')
  const notionNode = notionWorkflow.nodes.find((node) => node.type === 'n8n-nodes-base.notion')
  check(Boolean(notionNode), 'el workflow de logging contiene un nodo Notion')
  check(notionNode?.disabled === true, 'el nodo Notion está deshabilitado hasta configuración manual')
  check(notionNode?.parameters?.blockId?.value === '', 'el destino Notion queda vacío para selección manual')
  const assignments = notionWorkflow.nodes.find((node) => node.name === 'Prepare Notion Log Record')?.parameters?.assignments?.assignments ?? []
  const fieldNames = assignments.map((assignment) => assignment.name)
  const requiredFields = ['timestamp', 'source', 'workflow', 'prioridad', 'riesgo', 'estado_actual', 'siguiente_agente', 'revisores_posteriores', 'puede_llegar_a_codex', 'raw_output']
  check(requiredFields.every((field) => fieldNames.includes(field)), 'el registro Notion contiene todos los campos requeridos')
  const codexFlag = assignments.find((assignment) => assignment.name === 'puede_llegar_a_codex')
  check(codexFlag?.value === false, 'el registro Notion mantiene puede_llegar_a_codex en false')
  const serialized = JSON.stringify(notionWorkflow)
  const forbiddenTargets = ['IONPAY V1 - Restaurado', 'IONPAY V1', 'Folder ionPAY', 'IONPAY Resumen ejecutivo', 'Pitch Deck IONPAY']
  check(!forbiddenTargets.some((target) => serialized.includes(target)), 'el workflow de logging no contiene destinos Notion prohibidos')
}

check(!existsSync(envPath), 'el archivo .env no existe')
check(existsSync(envExamplePath), 'el archivo .env.example existe')

if (existsSync(envExamplePath)) {
  const expectedEnvExample = [
    'OPENAI_API_KEY=your_openai_api_key_here',
    'N8N_HOST=localhost',
    'N8N_PORT=5678',
  ].join('\n')
  const envExample = readFileSync(envExamplePath, 'utf8').trim().replaceAll('\r\n', '\n')
  check(envExample === expectedEnvExample, '.env.example contiene únicamente los placeholders aprobados')
}

check(existsSync(setupDocPath), 'la guía de credenciales OpenAI existe')
check(existsSync(workflowDocPath), 'la guía del workflow Orchestrator existe')

if (existsSync(setupDocPath) && existsSync(workflowDocPath)) {
  const docs = `${readFileSync(setupDocPath, 'utf8')}\n${readFileSync(workflowDocPath, 'utf8')}`
  check(docs.includes('OpenAI - ionPAY Local'), 'la documentación indica el nombre de credential recomendado')
  check(docs.includes('selecciona manualmente') || docs.includes('asociar manualmente'), 'la documentación exige asociar la credential manualmente')
  check(docs.includes('"prioridad": "P1"'), 'la documentación incluye el resultado P1 esperado')
  check(docs.includes('"puede_llegar_a_codex": false'), 'la documentación mantiene puede_llegar_a_codex en false')
}

const supportPaths = [workflowPath, fallbackWorkflowPath, notionWorkflowPath, envExamplePath, setupDocPath, workflowDocPath]
const supportSecretFindings = []
for (const path of supportPaths) {
  if (existsSync(path)) findSecretLikeText(readFileSync(path, 'utf8'), path, supportSecretFindings)
}
check(supportSecretFindings.length === 0, 'los archivos de soporte no contienen strings con apariencia de secreto')
for (const finding of supportSecretFindings) console.error(`  ${finding}`)

if (failures.length > 0) {
  console.error(`\nValidation failed with ${failures.length} error(s).`)
  process.exitCode = 1
} else {
  console.log('\nValidation passed. No network requests were made.')
}
