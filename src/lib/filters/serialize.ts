import type { FilterCondition } from './types'

export function serializeFilters(conditions: Array<FilterCondition>): string {
  return JSON.stringify(conditions)
}

export function deserializeFilters(json: string): Array<FilterCondition> {
  try {
    const parsed: unknown = JSON.parse(json)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is FilterCondition =>
        typeof item === 'object' &&
        item !== null &&
        'id' in item &&
        'field' in item &&
        'operator' in item,
    )
  } catch {
    return []
  }
}

export function filtersToSearchParams(
  conditions: Array<FilterCondition>,
): string {
  if (conditions.length === 0) return ''
  return encodeURIComponent(serializeFilters(conditions))
}

export function filtersFromSearchParams(param: string): Array<FilterCondition> {
  if (!param) return []
  try {
    return deserializeFilters(decodeURIComponent(param))
  } catch {
    return []
  }
}
