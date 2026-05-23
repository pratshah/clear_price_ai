import { MongoClient, type Db } from 'mongodb'

let client: MongoClient | null = null

export async function getDb(): Promise<Db> {
  const uri = process.env['MONGODB_URI']
  if (!uri) throw new Error('MONGODB_URI is not set')

  // Self-healing: if client exists but topology is disconnected, reset and reconnect
  if (client) {
    const isConnected = (client as any).topology && typeof (client as any).topology.isConnected === 'function'
      ? (client as any).topology.isConnected()
      : false;

    if (!isConnected) {
      console.warn('MongoDB client topology is disconnected. Resetting client...')
      try {
        await client.close()
      } catch (_) {}
      client = null
    }
  }

  if (!client) {
    client = new MongoClient(uri, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    })
    await client.connect()
  }
  return client.db(process.env['MONGODB_DATABASE'] ?? 'clearprice')
}
