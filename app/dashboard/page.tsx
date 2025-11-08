import { redirect } from "next/navigation"
import { getServerUser } from "@/lib/server"
import { DashboardClient } from "@/components/dashboard-client"

export default async function DashboardPage() {
  try {
    const user = await getServerUser()

    if (!user) {
      redirect("/auth/login")
    }

    return <DashboardClient user={user} />
  } catch (error) {
    console.error("[v0] Dashboard page error:", error)
    redirect("/auth/login")
  }
}
