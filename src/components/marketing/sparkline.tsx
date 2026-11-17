import { cn } from "cn"

const WIDTH = 100
const HEIGHT = 28
const PAD = 3

/**
 * Tiny response-time line (decorative; the number next to it carries the
 * value). Failed checks (null) break the line and get a red tick.
 */
export function Sparkline({
  values,
  className,
}: {
  values: readonly (number | null)[]
  className?: string
}) {
  const numbers = values.filter((value): value is number => value !== null)
  const max = Math.max(...numbers, 1)
  const min = Math.min(...numbers, 0)
  const span = Math.max(max - min, 1)
  const step = values.length > 1 ? WIDTH / (values.length - 1) : WIDTH
  const y = (value: number) =>
    HEIGHT - PAD - ((value - min) / span) * (HEIGHT - PAD * 2)

  // One polyline per run of successful checks.
  const runs: string[][] = []
  let current: string[] = []
  values.forEach((value, index) => {
    if (value === null) {
      if (current.length) runs.push(current)
      current = []
      return
    }
    current.push(`${(index * step).toFixed(2)},${y(value).toFixed(2)}`)
  })
  if (current.length) runs.push(current)

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn("h-7 w-full overflow-visible", className)}
    >
      {runs.map((points) => (
        <polyline
          key={points[0]}
          points={points.join(" ")}
          fill="none"
          className="stroke-chart-1"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {values.map((value, index) =>
        value === null ? (
          <line
            key={index}
            x1={index * step}
            x2={index * step}
            y1={HEIGHT - 9}
            y2={HEIGHT}
            className="stroke-down"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        ) : null
      )}
    </svg>
  )
}
