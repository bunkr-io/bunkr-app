import { describe, expect, it } from 'vitest'
import {
  deserializeFilters,
  filtersFromSearchParams,
  filtersToSearchParams,
  serializeFilters,
} from '../serialize'
import type { FilterCondition } from '../types'

const sampleConditions: Array<FilterCondition> = [
  { id: 'f1', field: 'category', operator: 'is_any_of', value: ['food'] },
  { id: 'f2', field: 'amount', operator: 'gt', value: 100 },
]

describe('serializeFilters / deserializeFilters', () => {
  it('round-trips correctly', () => {
    const json = serializeFilters(sampleConditions)
    const result = deserializeFilters(json)
    expect(result).toEqual(sampleConditions)
  })

  it('returns [] for invalid JSON', () => {
    expect(deserializeFilters('not-json')).toEqual([])
  })

  it('returns [] for non-array JSON', () => {
    expect(deserializeFilters('{"a":1}')).toEqual([])
  })

  it('filters out invalid items', () => {
    const json = JSON.stringify([
      sampleConditions[0],
      { invalid: true },
      sampleConditions[1],
    ])
    const result = deserializeFilters(json)
    expect(result).toHaveLength(2)
  })
})

describe('filtersToSearchParams / filtersFromSearchParams', () => {
  it('round-trips correctly', () => {
    const param = filtersToSearchParams(sampleConditions)
    const result = filtersFromSearchParams(param)
    expect(result).toEqual(sampleConditions)
  })

  it('returns empty string for empty conditions', () => {
    expect(filtersToSearchParams([])).toBe('')
  })

  it('returns [] for empty param', () => {
    expect(filtersFromSearchParams('')).toEqual([])
  })

  it('returns [] for invalid param', () => {
    expect(filtersFromSearchParams('%invalid')).toEqual([])
  })
})
