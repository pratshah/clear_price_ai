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
  const dbName = process.env['MONGODB_DATABASE'] ?? 'clearprice'

  if (client && db) {
    return db
  }

  if (!client) {
    client = new MongoClient(uri!, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    })
    await client.connect()
    db = client.db(dbName)
    console.log('[getDb] Successfully initialized new MCP MongoClient connection pool.')
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
