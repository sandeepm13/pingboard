"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { PauseIcon, PencilIcon, PlayIcon, ZapIcon } from "lucide-react"

import { testSavedMonitorAction } from "@/actions/monitors"
import { LoadingButton } from "@/components/common/loading-button"
import { Button } from "@/components/ui/button"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"

import { TestResult, type TestState } from "../form/test-result"
import { usePauseMonitor } from "../use-pause-monitor"

export function MonitorDetailActions({
  id,
  name,
  paused,
}: {
  id: string
  name: string
  paused: boolean
}) {
  const { setPaused, pending: pausing } = usePauseMonitor(id, name)
  const [test, setTest] = useState<TestState>({ kind: "idle" })
  const [testing, startTest] = useTransition()
  const [open, setOpen] = useState(false)

  function runTest() {
    setTest({ kind: "running" })
    setOpen(true)
    startTest(async () => {
      const result = await testSavedMonitorAction(id)
      setTest(
        "error" in result
          ? { kind: "error", message: result.error }
          : { kind: "done", result: result.result }
      )
    })
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <LoadingButton variant="outline" loading={testing} onClick={runTest}>
            {!testing && <ZapIcon aria-hidden="true" />}
            Test now
          </LoadingButton>
        </PopoverAnchor>
        <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))]">
          <TestResult state={test} />
        </PopoverContent>
      </Popover>
      <LoadingButton
        variant="outline"
        loading={pausing}
        onClick={() => setPaused(!paused)}
      >
        {!pausing &&
          (paused ? (
            <PlayIcon aria-hidden="true" />
          ) : (
            <PauseIcon aria-hidden="true" />
          ))}
        {paused ? "Resume" : "Pause"}
      </LoadingButton>
      <Button asChild variant="outline">
        <Link href={`/app/monitors/${id}/edit`}>
          <PencilIcon aria-hidden="true" />
          Edit
        </Link>
      </Button>
    </>
  )
}
