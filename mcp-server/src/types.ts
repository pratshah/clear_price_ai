// ── Hospitals ──────────────────────────────────────────────────────────────

export interface Hospital {
  ccn: string
  name: string
  system?: string
  address: { street: string; city: string; state: string; zip: string }
  location: { type: 'Point'; coordinates: [number, number] }
  phone?: string
  type?: string
  bed_count?: number
  trauma_level?: string
  nonprofit?: boolean
  google?: { place_id: string; rating: number; review_count: number; url: string }
  financials?: {
    total_charges: number
    charity_care_cost: number
    uncompensated_care: number
    charity_care_ratio: number
    fiscal_year: number
  }
  quality?: {
    cms_star_rating: number
    leapfrog_safety_grade: 'A' | 'B' | 'C' | 'D' | 'F'
    patient_experience: number
    readmission_rate: number
    mortality_rate: number
    hcahps_overall: number
    last_updated: Date
  }
}

// ── Prices ─────────────────────────────────────────────────────────────────

export interface Price {
  hospital_ccn: string
  procedure_code: string
  procedure_code_type: 'DRG' | 'APC'
  procedure_description: string
  plain_name: string
  setting: 'inpatient' | 'outpatient'
  // Inpatient DRG
  total_discharges?: number
  avg_covered_charges?: number
  avg_total_payments?: number
  avg_medicare_payments?: number
  // Outpatient APC
  total_services?: number
  avg_submitted_charges?: number
  avg_medicare_allowed?: number
  cms_year: number
}

export interface AscPrice {
  asc_ccn: string
  asc_name: string
  location: { type: 'Point'; coordinates: [number, number] }
  procedure_code: string
  procedure_code_type: 'APC'
  plain_name: string
  total_services: number
  avg_submitted_charges: number
  avg_medicare_allowed: number
  cms_year: number
  google?: { place_id: string; rating: number; review_count: number }
}

// ── Procedures ─────────────────────────────────────────────────────────────

export interface Procedure {
  code: string
  code_type: 'DRG' | 'APC'
  description: string
  plain_name: string
  aliases: string[]
  related_codes: Array<{ code: string; code_type: string; note: string }>
  category: string
  setting: 'inpatient' | 'outpatient' | 'both'
  embedding?: number[]
}

// ── Providers ──────────────────────────────────────────────────────────────

export interface Provider {
  npi: string
  name: { first: string; last: string; credential?: string }
  specialty: string
  taxonomy_code: string
  hospital_ccn?: string
  address: { street: string; city: string; state: string; zip: string }
  location: { type: 'Point'; coordinates: [number, number] }
  phone?: string
  accepting_new_patients?: boolean
  google?: { place_id: string; rating: number; review_count: number; url: string }
  cms_quality?: {
    medicare_patients: number
    quality_score: number
    malpractice_flag: boolean
    data_year: number
  }
}

// ── Sessions ───────────────────────────────────────────────────────────────

export interface Session {
  session_id: string
  user_id?: string
  messages: Array<{
    role: 'user' | 'assistant' | 'tool'
    content: string
    tool_name?: string
    timestamp: Date
  }>
  context: {
    zip_code?: string
    specialty?: string
    radius_miles?: number
  }
  ttl: Date
}
