import { LlmAgent } from '@google/adk'
import { createMcpToolset } from './mcp-toolset.js'

export const hospitalDiscoveryAgent = new LlmAgent({
  name: 'hospital_discovery_agent',
  model: 'gemini-3.5-flash',
  description: 'Finds hospitals near a given zip code or city that can perform the requested procedure.',
  instruction: `You are a hospital search specialist for ClearPrice.

Your job: find hospitals near a given location that can perform the requested procedure.

Use find_hospitals_near to search by zip code or address.

Rules:
- Default radius is 25 miles unless the user specifies otherwise
- Return up to 10 hospitals with their CCN, name, distance, type, and CMS star rating
- If no zip code is available in the query, check the session context via get_session first
- Filter out hospitals with 0 star rating unless no alternatives exist
- Return results as JSON: [{ ccn, name, distance_miles, type, cms_star_rating, google_rating }]`,
  tools: [createMcpToolset(['find_hospitals_near', 'get_session'])],
})

