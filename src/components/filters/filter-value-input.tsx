import { Check } from 'lucide-react'
import type {
  EnumOption,
  FilterFieldDescriptor,
  FilterOperator,
} from '~/lib/filters/types'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command'
import { cn } from '~/lib/utils'
import { RANGE_OPERATORS } from '~/lib/filters/operators'

interface FilterValueInputProps {
  field: FilterFieldDescriptor
  operator: FilterOperator
  value: unknown
  onChange: (value: unknown) => void
  onApply?: () => void
}

export function FilterValueInput({
  field,
  operator,
  value,
  onChange,
  onApply,
}: FilterValueInputProps) {
  switch (field.valueType) {
    case 'enum':
      return (
        <EnumInput
          options={
            typeof field.enumOptions === 'function'
              ? field.enumOptions()
              : (field.enumOptions ?? [])
          }
          value={(value as Array<string> | undefined) ?? []}
          onChange={onChange}
        />
      )
    case 'string':
      return (
        <StringInput
          value={(value as string | undefined) ?? ''}
          onChange={onChange}
          onApply={onApply}
        />
      )
    case 'number':
      return RANGE_OPERATORS.has(operator) ? (
        <NumberRangeInput
          value={
            (value as { from: number; to: number } | undefined) ?? {
              from: 0,
              to: 0,
            }
          }
          onChange={onChange}
          onApply={onApply}
        />
      ) : (
        <NumberInput
          value={value as number | undefined}
          onChange={onChange}
          onApply={onApply}
        />
      )
    case 'date':
      return RANGE_OPERATORS.has(operator) ? (
        <DateRangeInput
          value={
            (value as { from: string; to: string } | undefined) ?? {
              from: '',
              to: '',
            }
          }
          onChange={onChange}
          onApply={onApply}
        />
      ) : (
        <DateInput
          value={(value as string | undefined) ?? ''}
          onChange={onChange}
          onApply={onApply}
        />
      )
    case 'boolean':
      return (
        <BooleanInput
          value={value as boolean | undefined}
          onChange={onChange}
        />
      )
    default:
      return null
  }
}

function EnumInput({
  options,
  value,
  onChange,
}: {
  options: Array<EnumOption>
  value: Array<string>
  onChange: (value: unknown) => void
}) {
  const toggle = (optionValue: string) => {
    const next = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue]
    onChange(next)
  }

  return (
    <Command>
      <CommandInput placeholder="Search..." />
      <CommandList className="max-h-[200px]">
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup>
          {options.map((opt) => {
            const selected = value.includes(opt.value)
            return (
              <CommandItem
                key={opt.value}
                value={opt.label}
                onSelect={() => toggle(opt.value)}
              >
                <div
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded-sm border',
                    selected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/30',
                  )}
                >
                  {selected && <Check className="size-3" />}
                </div>
                {opt.color && (
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: opt.color }}
                  />
                )}
                <span className="truncate">{opt.label}</span>
              </CommandItem>
            )
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  )
}

function StringInput({
  value,
  onChange,
  onApply,
}: {
  value: string
  onChange: (value: unknown) => void
  onApply?: () => void
}) {
  return (
    <div className="flex gap-2 p-2">
      <Input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onApply?.()
        }}
        placeholder="Enter value..."
        className="h-8"
      />
      <Button size="sm" className="h-8" onClick={onApply}>
        Apply
      </Button>
    </div>
  )
}

function NumberInput({
  value,
  onChange,
  onApply,
}: {
  value: number | undefined
  onChange: (value: unknown) => void
  onApply?: () => void
}) {
  return (
    <div className="flex gap-2 p-2">
      <Input
        autoFocus
        type="number"
        value={value ?? ''}
        onChange={(e) =>
          onChange(e.target.value === '' ? undefined : Number(e.target.value))
        }
        onKeyDown={(e) => {
          if (e.key === 'Enter') onApply?.()
        }}
        placeholder="Enter number..."
        className="h-8"
      />
      <Button size="sm" className="h-8" onClick={onApply}>
        Apply
      </Button>
    </div>
  )
}

function NumberRangeInput({
  value,
  onChange,
  onApply,
}: {
  value: { from: number; to: number }
  onChange: (value: unknown) => void
  onApply?: () => void
}) {
  return (
    <div className="flex items-center gap-2 p-2">
      <Input
        autoFocus
        type="number"
        value={value.from || ''}
        onChange={(e) =>
          onChange({
            ...value,
            from: e.target.value === '' ? 0 : Number(e.target.value),
          })
        }
        placeholder="From"
        className="h-8"
      />
      <span className="text-sm text-muted-foreground">to</span>
      <Input
        type="number"
        value={value.to || ''}
        onChange={(e) =>
          onChange({
            ...value,
            to: e.target.value === '' ? 0 : Number(e.target.value),
          })
        }
        onKeyDown={(e) => {
          if (e.key === 'Enter') onApply?.()
        }}
        placeholder="To"
        className="h-8"
      />
      <Button size="sm" className="h-8 shrink-0" onClick={onApply}>
        Apply
      </Button>
    </div>
  )
}

function DateInput({
  value,
  onChange,
  onApply,
}: {
  value: string
  onChange: (value: unknown) => void
  onApply?: () => void
}) {
  return (
    <div className="flex gap-2 p-2">
      <Input
        autoFocus
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onApply?.()
        }}
        className="h-8"
      />
      <Button size="sm" className="h-8" onClick={onApply}>
        Apply
      </Button>
    </div>
  )
}

function DateRangeInput({
  value,
  onChange,
  onApply,
}: {
  value: { from: string; to: string }
  onChange: (value: unknown) => void
  onApply?: () => void
}) {
  return (
    <div className="flex items-center gap-2 p-2">
      <Input
        autoFocus
        type="date"
        value={value.from}
        onChange={(e) => onChange({ ...value, from: e.target.value })}
        className="h-8"
      />
      <span className="text-sm text-muted-foreground">to</span>
      <Input
        type="date"
        value={value.to}
        onChange={(e) => onChange({ ...value, to: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onApply?.()
        }}
        className="h-8"
      />
      <Button size="sm" className="h-8 shrink-0" onClick={onApply}>
        Apply
      </Button>
    </div>
  )
}

function BooleanInput({
  value,
  onChange,
}: {
  value: boolean | undefined
  onChange: (value: unknown) => void
}) {
  return (
    <div className="flex gap-2 p-2">
      <Button
        size="sm"
        variant={value === true ? 'default' : 'outline'}
        className="h-8 flex-1"
        onClick={() => onChange(true)}
      >
        Yes
      </Button>
      <Button
        size="sm"
        variant={value === false ? 'default' : 'outline'}
        className="h-8 flex-1"
        onClick={() => onChange(false)}
      >
        No
      </Button>
    </div>
  )
}
