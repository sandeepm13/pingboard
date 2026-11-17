import { Suspense } from "react"

import { AppLayout } from "@/components/layout/app-layout"
import {
  CurrentUserMenu,
  UserMenuSkeleton,
} from "@/components/layout/current-user-menu"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout
      userMenu={
        <Suspense fallback={<UserMenuSkeleton />}>
          <CurrentUserMenu />
        </Suspense>
      }
    >
      {children}
    </AppLayout>
  )
}
