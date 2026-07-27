import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { config } from './config.js'

const app = Fastify({ logger: true })

app.register(cors)
app.register(helmet)

app.get('/health', async () => ({ status: 'ok', service: 'phantom-api' }))

const start = async () => {
  try {
    await app.listen({ port: config.port, host: '0.0.0.0' })
    console.log(`Phantom API running on port ${config.port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
