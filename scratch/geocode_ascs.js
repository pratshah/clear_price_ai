import { MongoClient } from 'mongodb'

const uri = "mongodb+srv://REDACTED:REDACTED@cluster0.yhvy5c.mongodb.net/?appName=Cluster0"
const mapsApiKey = "REDACTED"
const client = new MongoClient(uri)

async function geocode(name, apiKey) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(name)}&key=${apiKey}`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    if (data.status !== 'OK' || !data.results[0]) return null
    const { lat, lng } = data.results[0].geometry.location
    return [lng, lat]
  } catch (err) {
    console.error(`Geocoding error for ${name}:`, err.message)
    return null
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function run() {
  try {
    await client.connect()
    const db = client.db('clearprice')
    const ascCol = db.collection('asc_prices')

    console.log("Finding unique ASCs with coordinates [0, 0]...")
    const uniqueAscs = await ascCol.aggregate([
      { $match: { 'location.coordinates.0': 0 } },
      { $group: { _id: '$asc_ccn', name: { $first: '$asc_name' } } }
    ]).toArray()

    console.log(`Found ${uniqueAscs.length} unique ASCs to geocode.`)

    let successCount = 0
    for (const asc of uniqueAscs) {
      const ccn = asc._id
      const name = asc.name
      console.log(`Geocoding ASC "${name}" (CCN: ${ccn})...`)

      const coords = await geocode(name, mapsApiKey)
      if (coords) {
        console.log(`  -> Success: [${coords[0]}, ${coords[1]}]`)
        const result = await ascCol.updateMany(
          { asc_ccn: ccn },
          { $set: { location: { type: 'Point', coordinates: coords } } }
        )
        console.log(`  -> Updated ${result.modifiedCount} price records.`)
        successCount++
      } else {
        console.log(`  -> Failed to geocode.`)
      }
      await sleep(100) // 10 requests per second rate limit safety
    }

    console.log(`\nGeocoding complete. Successfully geocoded ${successCount} out of ${uniqueAscs.length} ASCs.`)

  } catch (err) {
    console.error("Error:", err)
  } finally {
    await client.close()
  }
}

run()
