import type { ComponentType } from 'react'

export type FilterValueType = 'string' | 'number' | 'date' | 'enum' | 'boolean'

export type StringOperator =
  | 'is'
  | 'is_not'
  | 'contains'
  | 'does_not_contain'
  | 'is_any_of'
  | 'is_none_of'
  | 'is_empty'
  | 'is_not_empty'

export type NumberOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'between'
  | 'is_empty'
  | 'is_not_empty'

export type DateOperator =
  | 'is'
  | 'is_not'
  | 'gt'
  | 'lt'
  | 'between'
  | 'is_empty'
  | 'is_not_empty'

export type EnumOperator =
  | 'is_any_of'
  | 'is_none_of'
  | 'is_empty'
  | 'is_not_empty'

export type BooleanOperator = 'is'

export type FilterOperator =
  | StringOperator
  | NumberOperator
  | DateOperator
  | EnumOperator
  | BooleanOperator

export interface FilterCondition<TField extends string = string> {
  id: string
  field: TField
  operator: FilterOperator
  value: unknown
}

export interface EnumOption {
  value: string
  label: string
  color?: string
  icon?: string
}

export interface FilterFieldDescriptor<TField extends string = string> {
  name: TField
  label: string
  valueType: FilterValueType
  operators: Array<FilterOperator>
  defaultOperator: FilterOperator
  enumOptions?: Array<EnumOption> | (() => Array<EnumOption>)
  accessor: (record: Record<string, unknown>) => unknown
  icon?: ComponentType<{ className?: string }>
}

export interface FilterConfig<TField extends string = string> {
  fields: Array<FilterFieldDescriptor<TField>>
  fieldMap: Map<TField, FilterFieldDescriptor<TField>>
}
