import { redirect } from "next/navigation"
import { getServerUser } from "@/lib/server"
import { DashboardClient } from "@/components/dashboard-client"

export default async function DashboardPage() {
  console.log(`[DASHBOARD] START | Loading dashboard page...`)
  
  const user = await getServerUser()

  if (!user) {
    console.log(`[DASHBOARD] RESULT: NO_USER | Redirecting to /auth/login`)
    // Only redirect if we're sure there's no user
    // Don't redirect if there's an error - let the page handle it
    redirect("/auth/login")
  }

  console.log(`[DASHBOARD] RESULT: USER_FOUND | ID=${user.id} | Email=${user.email} | Rendering dashboard`)
  return <DashboardClient user={user} />
}
