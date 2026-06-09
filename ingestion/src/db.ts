import { config } from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

// Load .env from repo root regardless of cwd
const __dirname = fileURLToPath(new URL('.', import.meta.url))
config({ path: resolve(__dirname, '../../.env') })

import { MongoClient, type Db } from 'mongodb'

let client: MongoClient | null = null

export async function getDb(): Promise<Db> {
  const uri = process.env['MONGODB_URI']
  if (!uri) throw new Error('MONGODB_URI env var is required')
  if (!client || (client as any).topology?.closed) {
    client = new MongoClient(uri)
    await client.connect()
    console.log('Connected to MongoDB')
  }
  const dbName = process.env['MONGODB_DATABASE'] ?? 'clearprice'
  return client.db(dbName)
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.close()
    client = null
  }
}
