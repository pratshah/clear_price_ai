import { ParallelAgent, SequentialAgent } from '@google/adk'
import { procedureAgent } from './procedure-agent.js'
import { hospitalDiscoveryAgent } from './hospital-discovery-agent.js'
import { priceIntelAgent } from './price-intel-agent.js'
import { qualityFinancialAgent } from './quality-financial-agent.js'

const gatherPhase = new ParallelAgent({
  name: 'gather_phase',
  description: 'Looks up procedure codes and nearby hospitals simultaneously',
  subAgents: [procedureAgent, hospitalDiscoveryAgent],
})

const enrichPhase = new ParallelAgent({
  name: 'enrich_phase',
  description: 'Fetches pricing and quality/financial data simultaneously',
  subAgents: [priceIntelAgent, qualityFinancialAgent],
})

export const priceComparisonPipeline = new SequentialAgent({
  name: 'price_comparison_pipeline',
  description: 'Full pipeline for a procedure+location query: finds codes and hospitals, then fetches pricing and quality data.',
  subAgents: [gatherPhase, enrichPhase],
})
