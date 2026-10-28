import {
  ActivityIcon,
  CircleAlertIcon,
  PlusIcon,
  ShieldAlertIcon,
} from "lucide-react"

import { LogoMark, Logo } from "@/components/brand/logo"
import { EmptyState } from "@/components/common/empty-state"
import { PageHeader } from "@/components/common/page-header"
import {
  ChartSkeleton,
  FormSkeleton,
  MonitorListSkeleton,
  PageHeaderSkeleton,
  StatCardSkeleton,
} from "@/components/common/skeletons"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { DemoLabel } from "./section"

const BUTTON_VARIANTS = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "link",
] as const

export function BrandDemo() {
  return (
    <div className="flex flex-wrap items-center gap-8 rounded-xl border bg-card p-5">
      <Logo />
      <Logo className="text-xl" markClassName="size-8" />
      <LogoMark className="size-12" />
    </div>
  )
}

export function ButtonsDemo() {
  return (
    <div className="space-y-4 rounded-xl border bg-card p-5">
      <div className="flex flex-wrap gap-2">
        {BUTTON_VARIANTS.map((variant) => (
          <Button key={variant} variant={variant}>
            {variant}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm">Small</Button>
        <Button>Default</Button>
        <Button size="lg">
          <PlusIcon /> New monitor
        </Button>
        <Button size="icon" variant="outline" aria-label="Add">
          <PlusIcon />
        </Button>
        <Button disabled>Disabled</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge>default</Badge>
        <Badge variant="secondary">secondary</Badge>
        <Badge variant="outline" className="font-mono">
          GET
        </Badge>
        <Badge variant="outline" className="font-mono">
          every 5 min
        </Badge>
        <Badge variant="destructive">destructive</Badge>
      </div>
    </div>
  )
}

export function InputsDemo() {
  return (
    <div className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor="sg-keyword">Keyword (optional)</Label>
        <Input id="sg-keyword" placeholder="Welcome back" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="sg-timeout">Timeout (seconds)</Label>
        <Input
          id="sg-timeout"
          type="number"
          defaultValue={10}
          className="font-mono"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="sg-invalid">Invalid input</Label>
        <Input
          id="sg-invalid"
          aria-invalid
          defaultValue="localhost:3000"
          className="font-mono"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="sg-disabled">Disabled</Label>
        <Input id="sg-disabled" disabled placeholder="Not editable" />
      </div>
    </div>
  )
}

export function CardsDemo() {
  const stats = [
    { label: "Monitors", value: "5", hint: "4 active · 1 paused" },
    { label: "Uptime (30d)", value: "99.94%", hint: "Across all monitors" },
    { label: "Avg response", value: "312 ms", hint: "Last 24 hours" },
    { label: "Open incidents", value: "1", hint: "Checkout · 12 min" },
  ]
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader>
            <CardDescription>{stat.label}</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums">
              {stat.value}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {stat.hint}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function TabsAlertsDemo() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-xl border bg-card p-5">
        <DemoLabel>Tabs · Progress</DemoLabel>
        <Tabs defaultValue="24h">
          <TabsList>
            <TabsTrigger value="24h">24h</TabsTrigger>
            <TabsTrigger value="7d">7d</TabsTrigger>
            <TabsTrigger value="30d">30d</TabsTrigger>
          </TabsList>
          {[
            { value: "24h", uptime: 99.98 },
            { value: "7d", uptime: 99.71 },
            { value: "30d", uptime: 96.4 },
          ].map((tab) => (
            <TabsContent
              key={tab.value}
              value={tab.value}
              className="space-y-2 pt-4"
            >
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Uptime</span>
                <span className="font-mono tabular-nums">{tab.uptime}%</span>
              </div>
              <Progress value={tab.uptime} aria-label={`Uptime ${tab.value}`} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
      <div className="space-y-3">
        <Alert>
          <ShieldAlertIcon />
          <AlertTitle>SSL certificate expires in 9 days</AlertTitle>
          <AlertDescription>
            api.acme.dev · renews on Nov 3, 2026
          </AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Checkout is down</AlertTitle>
          <AlertDescription>
            503 Service Unavailable since 14:20 UTC
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}

export function StatesDemo() {
  return (
    <div className="space-y-8">
      <div>
        <DemoLabel>PageHeader</DemoLabel>
        <div className="rounded-xl border bg-card p-5">
          <PageHeader
            className="mb-0"
            title="Monitors"
            description="Every URL you're watching, at a glance."
            actions={
              <Button>
                <PlusIcon /> New monitor
              </Button>
            }
          />
        </div>
      </div>
      <div>
        <DemoLabel>EmptyState</DemoLabel>
        <EmptyState
          icon={ActivityIcon}
          title="No monitors yet"
          description="Add your first URL and PingBoard will start checking it within a minute."
          action={
            <Button>
              <PlusIcon /> Add monitor
            </Button>
          }
        />
      </div>
      <div className="space-y-4">
        <DemoLabel>Skeletons</DemoLabel>
        <PageHeaderSkeleton />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <MonitorListSkeleton rows={3} />
        <ChartSkeleton />
        <FormSkeleton fields={2} />
      </div>
      <Separator />
    </div>
  )
}
