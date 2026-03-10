import { useCallback, useMemo, useState } from 'react'
import type { FilterCondition, FilterConfig } from '~/lib/filters/types'
import { applyFilters } from '~/lib/filters/engine'

export interface UseFiltersReturn<TField extends string, TRecord> {
  conditions: Array<FilterCondition<TField>>
  filteredData: Array<TRecord> | undefined
  addCondition: (condition: FilterCondition<TField>) => void
  updateCondition: (
    id: string,
    updates: Partial<Omit<FilterCondition<TField>, 'id'>>,
  ) => void
  removeCondition: (id: string) => void
  clearAll: () => void
  loadConditions: (conditions: Array<FilterCondition<TField>>) => void
  hasActiveFilters: boolean
}

export function useFilters<TField extends string, TRecord>(
  data: Array<TRecord> | undefined,
  config: FilterConfig<TField>,
): UseFiltersReturn<TField, TRecord> {
  const [conditions, setConditions] = useState<Array<FilterCondition<TField>>>(
    [],
  )

  const addCondition = useCallback((condition: FilterCondition<TField>) => {
    setConditions((prev) => [...prev, condition])
  }, [])

  const updateCondition = useCallback(
    (id: string, updates: Partial<Omit<FilterCondition<TField>, 'id'>>) => {
      setConditions((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      )
    },
    [],
  )

  const removeCondition = useCallback((id: string) => {
    setConditions((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setConditions([])
  }, [])

  const loadConditions = useCallback(
    (newConditions: Array<FilterCondition<TField>>) => {
      setConditions(newConditions)
    },
    [],
  )

  const filteredData = useMemo(() => {
    if (!data) return undefined
    return applyFilters(data, conditions, config)
  }, [data, conditions, config])

  const hasActiveFilters = conditions.length > 0

  return {
    conditions,
    filteredData,
    addCondition,
    updateCondition,
    removeCondition,
    clearAll,
    loadConditions,
    hasActiveFilters,
  }
}
