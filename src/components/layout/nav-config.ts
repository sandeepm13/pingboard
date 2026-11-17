import {
  ActivityIcon,
  BellIcon,
  GlobeIcon,
  SettingsIcon,
  SirenIcon,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  /** Only active on the exact path. */
  exact?: boolean
  /** Other sections that highlight this item (and their sub-paths). */
  alsoActiveFor?: string[]
}

export const APP_NAV: NavItem[] = [
  {
    title: "Monitors",
    href: "/app",
    icon: ActivityIcon,
    exact: true,
    alsoActiveFor: ["/app/monitors"],
  },
  { title: "Incidents", href: "/app/incidents", icon: SirenIcon },
  { title: "Status pages", href: "/app/status-pages", icon: GlobeIcon },
  { title: "Alerts", href: "/app/alerts", icon: BellIcon },
  { title: "Settings", href: "/app/settings", icon: SettingsIcon },
]

export const MARKETING_NAV = [
  { title: "Features", href: "/#features" },
  { title: "Pricing", href: "/pricing" },
  { title: "Docs", href: "/docs" },
  { title: "Demo", href: "/demo" },
] as const
