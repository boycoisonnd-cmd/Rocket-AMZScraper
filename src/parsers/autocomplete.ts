/**
 * Amazon Autocomplete suggestions parser.
 * 100% Feature Parity with amazon/parsers.py (suggestion).
 */

import { AutocompleteSuggestion } from '../shared/types'
import { compact } from './helpers'

export function parseSuggestion(raw: Record<string, any>): AutocompleteSuggestion {
  const scopes = raw.scopes || [{}]
  return compact({
    value: raw.value || null,
    type: raw.type ? String(raw.type).toLowerCase() : null,
    department: scopes[0]?.name || null,
    department_alias: scopes[0]?.alias || null,
    is_ghost: raw.ghost ? true : null,
  }) as AutocompleteSuggestion
}

export function parseAutocompleteResponse(raw: any): AutocompleteSuggestion[] {
  if (!raw || !Array.isArray(raw.suggestions)) {
    return []
  }
  return raw.suggestions.map((s: any) => parseSuggestion(s))
}
