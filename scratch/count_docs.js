import { MongoClient } from 'mongodb'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve('.env') })

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error("MONGODB_URI not found")
  process.exit(1)
}

const client = new MongoClient(uri)

async function run() {
  try {
    await client.connect()
    const db = client.db('clearprice')
    
    const collections = ['procedures', 'providers', 'hospitals', 'asc_prices', 'prompts']
    for (const colName of collections) {
      const count = await db.collection(colName).countDocuments()
      console.log(`Collection '${colName}': ${count} documents`)
    }
  } catch (err) {
    console.error("Error:", err)
  } finally {
    await client.close()
  }
}

run()
