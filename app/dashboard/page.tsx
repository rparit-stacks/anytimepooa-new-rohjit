import { redirect } from "next/navigation"
import { getServerUser } from "@/lib/server"
import { DashboardClient } from "@/components/dashboard-client"

export default async function DashboardPage() {
  const user = await getServerUser()

  if (!user) {
    redirect("/auth/login")
  }

  return <DashboardClient user={user} />
}
