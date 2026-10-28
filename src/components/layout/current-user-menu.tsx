import { requireUser } from "@/lib/auth/require-user"
import { Skeleton } from "@/components/ui/skeleton"

import { UserMenu } from "./user-menu"

export async function CurrentUserMenu() {
  const user = await requireUser()
  return (
    <UserMenu
      user={{ name: user.name, email: user.email, image: user.image }}
    />
  )
}

export function UserMenuSkeleton() {
  return (
    <Skeleton className="size-8 rounded-full" aria-label="Loading account" />
  )
}
