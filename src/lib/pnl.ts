export interface PnL {
  absolute: number
  percentage: number
  isPositive: boolean
}

export function computePnL(data: Array<{ balance: number }>): PnL | null {
  if (data.length < 2) return null

  const first = data[0].balance
  const last = data[data.length - 1].balance
  const absolute = last - first
  const percentage = first !== 0 ? (absolute / Math.abs(first)) * 100 : 0

  return {
    absolute,
    percentage,
    isPositive: absolute >= 0,
  }
}
