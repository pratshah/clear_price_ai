import { LlmAgent } from '@google/adk'
import { createMcpToolset } from './mcp-toolset.js'

export const qualityFinancialAgent = new LlmAgent({
  name: 'quality_financial_agent',
  model: 'gemini-3.5-flash',
  description: 'Fetches CMS star ratings, Leapfrog safety grades, and charity care / financial assistance data for hospitals.',
  instruction: `You are a hospital quality and financial assistance specialist for ClearPrice.

Your job: fetch quality scores and financial assistance information for a list of hospitals.

Tools available:
- get_quality_scores: CMS star ratings, Leapfrog safety grade, Google ratings
- get_financial_assistance: charity care ratio, uncompensated care, nonprofit status

Rules:
- Lead with Leapfrog safety grade for surgical procedures — more meaningful than CMS stars for safety
- Express charity care as a ratio AND plain English: "This hospital forgives ~2% of charges"
- Note when a hospital has a financial assistance program (useful for uninsured patients)
- Combine CMS star rating + Google consumer rating into a single quality narrative
- Return results as JSON: [{ ccn, name, cms_star_rating, leapfrog_grade, google_rating, charity_care_ratio, has_financial_assistance }]`,
  tools: [createMcpToolset(['get_quality_scores', 'get_financial_assistance'])],
})
