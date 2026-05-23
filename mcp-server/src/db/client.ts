import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { MongoClient, Db } from 'mongodb'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../../.env') })

const uri = process.env['MONGODB_URI']
if (!uri) throw new Error('MONGODB_URI is not set')

let client: MongoClient | null = null
let db: Db | null = null

export async function getDb(): Promise<Db> {
  // Self-healing: if client exists but topology is disconnected, reset and reconnect
  if (client) {
    const isConnected = (client as any).topology && typeof (client as any).topology.isConnected === 'function'
      ? (client as any).topology.isConnected()
      : false;

    if (!isConnected) {
      console.warn('MCP MongoDB client topology is disconnected. Resetting client...')
      try {
        await client.close()
      } catch (_) {}
      client = null
      db = null
    }
  }

  if (!client) {
    client = new MongoClient(uri!, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    })
    await client.connect()
    db = client.db(process.env['MONGODB_DATABASE'] ?? 'clearprice')
  }
  return db!
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.close()
  }
  client = null
  db = null
}
