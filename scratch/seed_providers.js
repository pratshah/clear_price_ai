import { MongoClient } from 'mongodb'

const uri = "mongodb+srv://REDACTED:REDACTED@cluster0.yhvy5c.mongodb.net/?appName=Cluster0"
const client = new MongoClient(uri)

const orthopedicSurgeons = [
  {
    npi: "1982736450",
    name: { first: "Richard", last: "O'Donnell", credential: "MD" },
    specialty: "ORTHOPEDIC SURGERY",
    phone: "415-353-2808",
    accepting_new_patients: true,
    google: {
      rating: 4.9,
      review_count: 142,
      url: "https://maps.google.com/?cid=1"
    },
    cms_quality: {
      medicare_patients: 185,
      quality_score: 98,
      malpractice_flag: false,
      data_year: 2024
    }
  },
  {
    npi: "1827364509",
    name: { first: "Stefano", last: "Bini", credential: "MD" },
    specialty: "ORTHOPEDIC SURGERY",
    phone: "415-353-2808",
    accepting_new_patients: true,
    google: {
      rating: 4.8,
      review_count: 98,
      url: "https://maps.google.com/?cid=2"
    },
    cms_quality: {
      medicare_patients: 210,
      quality_score: 96,
      malpractice_flag: false,
      data_year: 2024
    }
  },
  {
    npi: "1736450918",
    name: { first: "Rosanna", last: "Wustrack", credential: "MD" },
    specialty: "ORTHOPEDIC SURGERY",
    phone: "415-353-2808",
    accepting_new_patients: true,
    google: {
      rating: 4.7,
      review_count: 64,
      url: "https://maps.google.com/?cid=3"
    },
    cms_quality: {
      medicare_patients: 115,
      quality_score: 94,
      malpractice_flag: false,
      data_year: 2024
    }
  },
  {
    npi: "1645091827",
    name: { first: "Thomas", last: "Vail", credential: "MD" },
    specialty: "ORTHOPEDIC SURGERY",
    phone: "415-353-2808",
    accepting_new_patients: false,
    google: {
      rating: 4.9,
      review_count: 215,
      url: "https://maps.google.com/?cid=4"
    },
    cms_quality: {
      medicare_patients: 320,
      quality_score: 99,
      malpractice_flag: false,
      data_year: 2024
    }
  },
  {
    npi: "1509182736",
    name: { first: "William", last: "Bargran", credential: "MD" },
    specialty: "ORTHOPEDIC SURGERY",
    phone: "415-353-2808",
    accepting_new_patients: true,
    google: {
      rating: 4.6,
      review_count: 42,
      url: "https://maps.google.com/?cid=5"
    },
    cms_quality: {
      medicare_patients: 90,
      quality_score: 91,
      malpractice_flag: false,
      data_year: 2024
    }
  }
]

async function run() {
  try {
    await client.connect()
    const db = client.db('clearprice')
    const hospitalsCol = db.collection('hospitals')
    const providersCol = db.collection('providers')

    // Find UCSF Medical Center CCN
    const ucsf = await hospitalsCol.findOne({ name: { $regex: 'UCSF', $options: 'i' } })
    if (!ucsf) {
      console.error("UCSF Medical Center hospital record not found!")
      return
    }

    console.log(`Found UCSF Medical Center: ${ucsf.name} (CCN: ${ucsf.ccn})`)
    const ccn = ucsf.ccn
    const latLng = ucsf.location?.coordinates ?? [-122.4578, 37.7631]

    console.log("Seeding orthopedic surgeons for UCSF...")
    const providers = orthopedicSurgeons.map((s) => ({
      ...s,
      hospital_ccn: ccn,
      address: ucsf.address,
      location: { type: 'Point', coordinates: latLng }
    }))

    // Clean first
    await providersCol.deleteMany({ hospital_ccn: ccn })

    // Insert
    const result = await providersCol.insertMany(providers)
    console.log(`Successfully seeded ${result.insertedCount} Orthopedic Surgeons for UCSF.`)

    // Create Indexes
    console.log("Creating indexes on providers collection...")
    await providersCol.createIndex({ npi: 1 }, { unique: true })
    await providersCol.createIndex({ hospital_ccn: 1 })
    await providersCol.createIndex({ location: '2dsphere' })
    await providersCol.createIndex({ specialty: 'text' })
    console.log("Indexes created successfully!")

  } catch (err) {
    console.error("Error:", err)
  } finally {
    await client.close()
  }
}

run()
