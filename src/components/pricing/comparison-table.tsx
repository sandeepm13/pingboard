import { CheckIcon, MinusIcon } from "lucide-react"

import { PLAN_LIMITS } from "@shared/plans"
import { PLANS } from "@shared/constants"
import { comparisonRows } from "@/lib/pricing"

function Cell({ value }: { value: string | boolean }) {
  if (typeof value === "string") {
    return <span className="font-mono tabular-nums">{value}</span>
  }
  return value ? (
    <>
      <CheckIcon aria-hidden="true" className="inline size-4 text-up" />
      <span className="sr-only">Included</span>
    </>
  ) : (
    <>
      <MinusIcon
        aria-hidden="true"
        className="inline size-4 text-muted-foreground"
      />
      <span className="sr-only">Not included</span>
    </>
  )
}

export function ComparisonTable() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <table className="w-full text-sm">
        <caption className="sr-only">Plan comparison</caption>
        <thead>
          <tr className="border-b bg-muted/40">
            <th scope="col" className="px-4 py-3 text-left font-medium sm:px-5">
              Feature
            </th>
            {PLANS.map((plan) => (
              <th
                key={plan}
                scope="col"
                className="w-20 px-4 py-3 text-center font-medium sm:w-32"
              >
                {PLAN_LIMITS[plan].label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {comparisonRows().map((row) => (
            <tr key={row.label}>
              <th
                scope="row"
                className="px-4 py-3 text-left font-normal text-muted-foreground sm:px-5"
              >
                {row.label}
              </th>
              {PLANS.map((plan) => (
                <td key={plan} className="px-4 py-3 text-center">
                  <Cell value={row.values[plan]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
