// Active region filter — controls which states appear on the website
// To expand coverage, add states to the array or set ACTIVE_STATES to null to show all
export const ACTIVE_STATES: string[] | null = [
  // DMV (core)
  'DC', 'MD', 'VA',
  // Mid-Atlantic
  'WV', 'PA', 'NJ', 'DE', 'NY',
  // New England
  'CT', 'MA', 'RI', 'VT', 'NH', 'ME',
  // Southeast
  'NC', 'SC', 'GA', 'FL', 'AL', 'MS', 'TN', 'KY',
  // Great Lakes / Midwest (east of Mississippi)
  'OH', 'IN', 'MI', 'IL', 'WI',
]

// Helper to add state filter to a Supabase query
export function applyStateFilter(query: any) {
  if (ACTIVE_STATES && ACTIVE_STATES.length > 0) {
    return query.in('state', ACTIVE_STATES)
  }
  return query
}
