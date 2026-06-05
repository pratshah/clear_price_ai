import { getDb } from './db/client.js'

async function run() {
  console.log('Connecting to database...')
  try {
    const db = await getDb()
    console.log('Database connected!')
    const collections = await db.listCollections().toArray()
    console.log('Collections in database:')
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments()
      console.log(`- ${col.name}: ${count} documents`)
    }

    // Try finding procedures matching "replacement" or "joint" or code "470"
    const replacementProcedures = await db.collection('procedures')
      .find({ 
        $or: [
          { plain_name: /replacement/i },
          { description: /replacement/i },
          { code: "470" }
        ]
      })
      .limit(5)
      .toArray()
    console.log('\nSample "replacement" or "470" procedures:')
    console.log(JSON.stringify(replacementProcedures, null, 2))

    // Try finding procedures matching "joint"
    const jointProcedures = await db.collection('procedures')
      .find({ plain_name: /joint/i })
      .limit(5)
      .toArray()
    console.log('\nSample "joint" procedures:')
    console.log(JSON.stringify(jointProcedures, null, 2))
  } catch (err) {
    console.error('Error running DB test:', err)
  }
}

run().then(() => process.exit(0))
