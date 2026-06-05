import { getDb } from './src/db/client.js';
import { config } from 'dotenv';
config({ path: '../.env' });
(async () => {
  const db = await getDb();
  const results = await db.collection('procedures').find({
    $or: [
      { plain_name: /colonoscopy/i },
      { description: /colonoscopy/i },
      { aliases: /colonoscopy/i },
    ]
  }).toArray();
  console.log(results);
  process.exit(0);
})();
