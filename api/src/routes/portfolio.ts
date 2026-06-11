import { Hono } from 'hono'
import { getDb } from '../db.js'

export const portfolioRoute = new Hono()

// GET /api/portfolio -> list all saved hospitals
portfolioRoute.get('/', async (c) => {
  try {
    const db = await getDb()
    const list = await db.collection('portfolio').find({}).toArray()
    return c.json({ portfolio: list })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: msg }, 500)
  }
})

// POST /api/portfolio -> save a hospital to portfolio
portfolioRoute.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const { ccn, name, cms_star_rating, google_rating, state, address } = body

    if (!ccn || !name) {
      return c.json({ error: 'Missing ccn or name' }, 400)
    }

    const db = await getDb()
    const doc = {
      ccn,
      name,
      cms_star_rating: cms_star_rating ?? null,
      google_rating: google_rating ?? null,
      state: state ?? '',
      address: address ?? '',
      saved_at: new Date()
    }

    await db.collection('portfolio').updateOne(
      { ccn },
      { $set: doc },
      { upsert: true }
    )

    return c.json({ ok: true, saved: doc })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: msg }, 500)
  }
})

// DELETE /api/portfolio/:ccn -> remove a hospital
portfolioRoute.delete('/:ccn', async (c) => {
  try {
    const ccn = c.req.param('ccn')
    const db = await getDb()
    const result = await db.collection('portfolio').deleteOne({ ccn })
    return c.json({ ok: true, deletedCount: result.deletedCount })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: msg }, 500)
  }
})
