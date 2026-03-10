import { describe, expect, it } from 'vitest'
import { applyFilters, evaluateCondition } from '../engine'
import type {
  FilterCondition,
  FilterConfig,
  FilterFieldDescriptor,
} from '../types'

const stringField: FilterFieldDescriptor = {
  name: 'name',
  label: 'Name',
  valueType: 'string',
  operators: [
    'is',
    'is_not',
    'contains',
    'does_not_contain',
    'is_any_of',
    'is_none_of',
    'is_empty',
    'is_not_empty',
  ],
  defaultOperator: 'contains',
  accessor: (r) => r.name,
}

const numberField: FilterFieldDescriptor = {
  name: 'amount',
  label: 'Amount',
  valueType: 'number',
  operators: [
    'eq',
    'neq',
    'gt',
    'lt',
    'gte',
    'lte',
    'between',
    'is_empty',
    'is_not_empty',
  ],
  defaultOperator: 'gt',
  accessor: (r) => r.amount,
}

const dateField: FilterFieldDescriptor = {
  name: 'date',
  label: 'Date',
  valueType: 'date',
  operators: [
    'is',
    'is_not',
    'gt',
    'lt',
    'between',
    'is_empty',
    'is_not_empty',
  ],
  defaultOperator: 'between',
  accessor: (r) => r.date,
}

const enumField: FilterFieldDescriptor = {
  name: 'status',
  label: 'Status',
  valueType: 'enum',
  operators: ['is_any_of', 'is_none_of', 'is_empty', 'is_not_empty'],
  defaultOperator: 'is_any_of',
  enumOptions: [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ],
  accessor: (r) => r.status,
}

const boolField: FilterFieldDescriptor = {
  name: 'coming',
  label: 'Pending',
  valueType: 'boolean',
  operators: ['is'],
  defaultOperator: 'is',
  accessor: (r) => r.coming,
}

const fields = [stringField, numberField, dateField, enumField, boolField]
const config: FilterConfig = {
  fields,
  fieldMap: new Map(fields.map((f) => [f.name, f])),
}

function cond(
  field: string,
  operator: string,
  value: unknown,
): FilterCondition {
  return {
    id: '1',
    field,
    operator: operator as FilterCondition['operator'],
    value,
  }
}

describe('evaluateCondition — string', () => {
  const record = {
    name: 'Hello World',
    amount: 0,
    date: '',
    status: '',
    coming: false,
  }

  it('is (case-insensitive)', () => {
    expect(
      evaluateCondition(record, cond('name', 'is', 'hello world'), config),
    ).toBe(true)
    expect(evaluateCondition(record, cond('name', 'is', 'other'), config)).toBe(
      false,
    )
  })

  it('is_not', () => {
    expect(
      evaluateCondition(record, cond('name', 'is_not', 'other'), config),
    ).toBe(true)
    expect(
      evaluateCondition(record, cond('name', 'is_not', 'hello world'), config),
    ).toBe(false)
  })

  it('contains', () => {
    expect(
      evaluateCondition(record, cond('name', 'contains', 'World'), config),
    ).toBe(true)
    expect(
      evaluateCondition(record, cond('name', 'contains', 'xyz'), config),
    ).toBe(false)
  })

  it('does_not_contain', () => {
    expect(
      evaluateCondition(
        record,
        cond('name', 'does_not_contain', 'xyz'),
        config,
      ),
    ).toBe(true)
    expect(
      evaluateCondition(
        record,
        cond('name', 'does_not_contain', 'hello'),
        config,
      ),
    ).toBe(false)
  })

  it('is_any_of', () => {
    expect(
      evaluateCondition(
        record,
        cond('name', 'is_any_of', ['Hello World', 'other']),
        config,
      ),
    ).toBe(true)
    expect(
      evaluateCondition(record, cond('name', 'is_any_of', ['a', 'b']), config),
    ).toBe(false)
  })

  it('is_none_of', () => {
    expect(
      evaluateCondition(record, cond('name', 'is_none_of', ['a', 'b']), config),
    ).toBe(true)
    expect(
      evaluateCondition(
        record,
        cond('name', 'is_none_of', ['Hello World']),
        config,
      ),
    ).toBe(false)
  })

  it('is_empty / is_not_empty', () => {
    expect(
      evaluateCondition(record, cond('name', 'is_empty', null), config),
    ).toBe(false)
    expect(
      evaluateCondition(record, cond('name', 'is_not_empty', null), config),
    ).toBe(true)
    const empty = { ...record, name: '' }
    expect(
      evaluateCondition(empty, cond('name', 'is_empty', null), config),
    ).toBe(true)
  })

  it('null value treated as empty string', () => {
    const nullRecord = { ...record, name: null }
    expect(
      evaluateCondition(
        nullRecord as Record<string, unknown>,
        cond('name', 'is_empty', null),
        config,
      ),
    ).toBe(true)
  })
})

describe('evaluateCondition — number', () => {
  const record = { name: '', amount: 50, date: '', status: '', coming: false }

  it('eq / neq', () => {
    expect(evaluateCondition(record, cond('amount', 'eq', 50), config)).toBe(
      true,
    )
    expect(evaluateCondition(record, cond('amount', 'eq', 51), config)).toBe(
      false,
    )
    expect(evaluateCondition(record, cond('amount', 'neq', 51), config)).toBe(
      true,
    )
  })

  it('gt / lt / gte / lte', () => {
    expect(evaluateCondition(record, cond('amount', 'gt', 49), config)).toBe(
      true,
    )
    expect(evaluateCondition(record, cond('amount', 'gt', 50), config)).toBe(
      false,
    )
    expect(evaluateCondition(record, cond('amount', 'gte', 50), config)).toBe(
      true,
    )
    expect(evaluateCondition(record, cond('amount', 'lt', 51), config)).toBe(
      true,
    )
    expect(evaluateCondition(record, cond('amount', 'lte', 50), config)).toBe(
      true,
    )
  })

  it('between', () => {
    expect(
      evaluateCondition(
        record,
        cond('amount', 'between', { from: 40, to: 60 }),
        config,
      ),
    ).toBe(true)
    expect(
      evaluateCondition(
        record,
        cond('amount', 'between', { from: 51, to: 60 }),
        config,
      ),
    ).toBe(false)
  })

  it('is_empty / is_not_empty', () => {
    expect(
      evaluateCondition(record, cond('amount', 'is_not_empty', null), config),
    ).toBe(true)
    const nullRecord = { ...record, amount: null }
    expect(
      evaluateCondition(
        nullRecord as Record<string, unknown>,
        cond('amount', 'is_empty', null),
        config,
      ),
    ).toBe(true)
  })
})

describe('evaluateCondition — date', () => {
  const record = {
    name: '',
    amount: 0,
    date: '2025-03-15',
    status: '',
    coming: false,
  }

  it('is / is_not', () => {
    expect(
      evaluateCondition(record, cond('date', 'is', '2025-03-15'), config),
    ).toBe(true)
    expect(
      evaluateCondition(record, cond('date', 'is_not', '2025-03-15'), config),
    ).toBe(false)
  })

  it('gt / lt (lexicographic)', () => {
    expect(
      evaluateCondition(record, cond('date', 'gt', '2025-03-14'), config),
    ).toBe(true)
    expect(
      evaluateCondition(record, cond('date', 'lt', '2025-03-16'), config),
    ).toBe(true)
  })

  it('between', () => {
    expect(
      evaluateCondition(
        record,
        cond('date', 'between', { from: '2025-03-01', to: '2025-03-31' }),
        config,
      ),
    ).toBe(true)
    expect(
      evaluateCondition(
        record,
        cond('date', 'between', { from: '2025-04-01', to: '2025-04-30' }),
        config,
      ),
    ).toBe(false)
  })

  it('is_empty / is_not_empty', () => {
    expect(
      evaluateCondition(record, cond('date', 'is_not_empty', null), config),
    ).toBe(true)
    const empty = { ...record, date: '' }
    expect(
      evaluateCondition(empty, cond('date', 'is_empty', null), config),
    ).toBe(true)
  })
})

describe('evaluateCondition — enum', () => {
  const record = {
    name: '',
    amount: 0,
    date: '',
    status: 'active',
    coming: false,
  }

  it('is_any_of / is_none_of', () => {
    expect(
      evaluateCondition(
        record,
        cond('status', 'is_any_of', ['active']),
        config,
      ),
    ).toBe(true)
    expect(
      evaluateCondition(
        record,
        cond('status', 'is_any_of', ['inactive']),
        config,
      ),
    ).toBe(false)
    expect(
      evaluateCondition(
        record,
        cond('status', 'is_none_of', ['inactive']),
        config,
      ),
    ).toBe(true)
    expect(
      evaluateCondition(
        record,
        cond('status', 'is_none_of', ['active']),
        config,
      ),
    ).toBe(false)
  })

  it('is_empty / is_not_empty', () => {
    expect(
      evaluateCondition(record, cond('status', 'is_not_empty', null), config),
    ).toBe(true)
    const empty = { ...record, status: '' }
    expect(
      evaluateCondition(empty, cond('status', 'is_empty', null), config),
    ).toBe(true)
  })
})

describe('evaluateCondition — boolean', () => {
  it('is true / false', () => {
    const record = { name: '', amount: 0, date: '', status: '', coming: true }
    expect(evaluateCondition(record, cond('coming', 'is', true), config)).toBe(
      true,
    )
    expect(evaluateCondition(record, cond('coming', 'is', false), config)).toBe(
      false,
    )
  })
})

describe('evaluateCondition — unknown field', () => {
  it('passes through', () => {
    const record = {
      name: 'test',
      amount: 0,
      date: '',
      status: '',
      coming: false,
    }
    expect(
      evaluateCondition(record, cond('unknown', 'is', 'test'), config),
    ).toBe(true)
  })
})

describe('applyFilters', () => {
  const data = [
    {
      name: 'Alice',
      amount: 100,
      date: '2025-01-01',
      status: 'active',
      coming: false,
    },
    {
      name: 'Bob',
      amount: 50,
      date: '2025-02-01',
      status: 'inactive',
      coming: true,
    },
    {
      name: 'Carol',
      amount: 200,
      date: '2025-03-01',
      status: 'active',
      coming: false,
    },
  ]

  it('returns all with no conditions', () => {
    expect(applyFilters(data, [], config)).toBe(data)
  })

  it('filters with single condition', () => {
    const result = applyFilters(
      data,
      [cond('status', 'is_any_of', ['active'])],
      config,
    )
    expect(result).toHaveLength(2)
  })

  it('AND logic with multiple conditions', () => {
    const result = applyFilters(
      data,
      [cond('status', 'is_any_of', ['active']), cond('amount', 'gt', 150)],
      config,
    )
    expect(result).toHaveLength(1)
    expect((result[0] as Record<string, unknown>).name).toBe('Carol')
  })
})
