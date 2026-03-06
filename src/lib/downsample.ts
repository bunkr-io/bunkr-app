/**
 * Downsamples a sorted array of data points to at most `maxPoints` entries
 * using the Largest-Triangle-Three-Buckets (LTTB) algorithm.
 * Preserves visual shape much better than simple interval sampling.
 */
export function downsample<T extends { date: string; balance: number }>(
  data: Array<T>,
  maxPoints: number,
): Array<T> {
  if (data.length <= maxPoints) return data

  const sampled: Array<T> = [data[0]] // Always keep first point
  const bucketSize = (data.length - 2) / (maxPoints - 2)

  let prevIndex = 0

  for (let i = 1; i < maxPoints - 1; i++) {
    const bucketStart = Math.floor((i - 1) * bucketSize) + 1
    const bucketEnd = Math.min(Math.floor(i * bucketSize) + 1, data.length - 1)

    // Calculate average point of next bucket for area comparison
    const nextBucketStart = Math.floor(i * bucketSize) + 1
    const nextBucketEnd = Math.min(
      Math.floor((i + 1) * bucketSize) + 1,
      data.length - 1,
    )
    let avgBalance = 0
    let avgIndex = 0
    const nextBucketLen = nextBucketEnd - nextBucketStart + 1
    for (let j = nextBucketStart; j <= nextBucketEnd; j++) {
      avgBalance += data[j].balance
      avgIndex += j
    }
    avgBalance /= nextBucketLen
    avgIndex /= nextBucketLen

    // Find point in current bucket that creates largest triangle
    let maxArea = -1
    let bestIndex = bucketStart
    const prevBalance = data[prevIndex].balance

    for (let j = bucketStart; j <= bucketEnd; j++) {
      const area = Math.abs(
        (prevIndex - avgIndex) * (data[j].balance - prevBalance) -
          (prevIndex - j) * (avgBalance - prevBalance),
      )
      if (area > maxArea) {
        maxArea = area
        bestIndex = j
      }
    }

    sampled.push(data[bestIndex])
    prevIndex = bestIndex
  }

  sampled.push(data[data.length - 1]) // Always keep last point
  return sampled
}

/**
 * Downsamples generic record-based chart data (e.g. stacked charts)
 * by evenly picking points. Always keeps first and last.
 */
export function downsampleRecords<T>(
  data: Array<T>,
  maxPoints: number,
): Array<T> {
  if (data.length <= maxPoints) return data

  const sampled: Array<T> = [data[0]]
  const step = (data.length - 1) / (maxPoints - 1)

  for (let i = 1; i < maxPoints - 1; i++) {
    sampled.push(data[Math.round(i * step)])
  }

  sampled.push(data[data.length - 1])
  return sampled
}
