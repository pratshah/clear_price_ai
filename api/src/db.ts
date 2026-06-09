import { MongoClient, type Db } from 'mongodb'

let client: MongoClient | null = null

export async function getDb(): Promise<Db> {
  const uri = process.env['MONGODB_URI']
  if (!uri) throw new Error('MONGODB_URI is not set')
  const dbName = process.env['MONGODB_DATABASE'] ?? 'clearprice'

  if (client) {
    try {
      await client.db(dbName).command({ ping: 1 })
    } catch (err) {
      console.warn('[getDb] Connection pool is dead or topology is closed. Re-initializing client...', err)
      try {
        await client.close()
      } catch {}
      client = null
    }
  }

  if (!client) {
    client = new MongoClient(uri, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    })
    await client.connect()
    console.log('[getDb] Successfully initialized new MongoClient connection pool.')
  }
  return client.db(dbName)
}

