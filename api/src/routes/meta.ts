import { Hono } from 'hono'
import { getFreshness } from '../lib/changeStreams.js'

export const metaRoute = new Hono()

metaRoute.get('/freshness', (c) => {
  const state = getFreshness()

  const now = Date.now()
  const ageMs = (d: Date | null) => (d ? now - d.getTime() : null)
  const ageDays = (d: Date | null) => {
    const ms = ageMs(d)
    return ms !== null ? Math.floor(ms / (1000 * 60 * 60 * 24)) : null
  }

  return c.json({
    prices: {
      last_updated: state.prices.last_updated,
      age_days: ageDays(state.prices.last_updated),
      record_count: state.prices.record_count,
      updates_observed: state.prices.updates_observed,
    },
    hospitals: {
      last_updated: state.hospitals.last_updated,
      age_days: ageDays(state.hospitals.last_updated),
      record_count: state.hospitals.record_count,
      updates_observed: state.hospitals.updates_observed,
    },
    started_at: state.started_at,
    data_source: 'CMS Medicare 2024',
    cms_year: 2024,
  })
})
