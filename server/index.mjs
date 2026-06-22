import { createIonPayServer } from './app.mjs'

const port = Number(process.env.IONPAY_API_PORT ?? 8787)
const app = createIonPayServer({ dbPath: process.env.IONPAY_DB_PATH ?? 'data/ionpay.db', demoMode: process.env.NODE_ENV !== 'production' })

await app.listen(port)
console.log(`IONPAY API disponible en http://127.0.0.1:${port}`)

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await app.close()
    process.exit(0)
  })
}
