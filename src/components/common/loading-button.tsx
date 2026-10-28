import { Loader2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"

export function LoadingButton({
  loading = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { loading?: boolean }) {
  return (
    <Button
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2Icon className="animate-spin" aria-hidden="true" />}
      {children}
    </Button>
  )
}
