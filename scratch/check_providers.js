import { MongoClient } from 'mongodb'

const uri = "mongodb+srv://REDACTED:REDACTED@cluster0.yhvy5c.mongodb.net/?appName=Cluster0"
const client = new MongoClient(uri)

async function run() {
  try {
    await client.connect()
    const db = client.db('clearprice')
    const ascCol = db.collection('asc_prices')
    
    console.log("Distinct ASCs (by CCN):")
    const ccns = await ascCol.distinct("asc_ccn")
    console.log("Unique ASC count:", ccns.length)

    console.log("\nSample ASC names and CCNs:")
    const sampleAses = await ascCol.find({}, { projection: { asc_ccn: 1, asc_name: 1 } }).limit(10).toArray()
    console.log(sampleAses)

  } catch (err) {
    console.error("Error:", err)
  } finally {
    await client.close()
  }
}

run()
