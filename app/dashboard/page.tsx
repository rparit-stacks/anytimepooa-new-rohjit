import { redirect } from "next/navigation"
import { getServerUser } from "@/lib/server"
import { DashboardClient } from "@/components/dashboard-client"

export default async function DashboardPage() {
  console.log("[Dashboard] Checking user...")
  const user = await getServerUser()

  if (!user) {
    console.log("[Dashboard] No user found, redirecting to login")
    // Only redirect if we're sure there's no user
    // Don't redirect if there's an error - let the page handle it
    redirect("/auth/login")
  }

  console.log("[Dashboard] User found, rendering dashboard for:", user.email)
  return <DashboardClient user={user} />
}
