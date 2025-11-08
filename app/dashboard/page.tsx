import { redirect } from "next/navigation"
import { getServerUser } from "@/lib/server"
import { DashboardClient } from "@/components/dashboard-client"

export default async function DashboardPage() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("[DASHBOARD] 🚀 PAGE LOAD STARTED")
  console.log("[DASHBOARD] Checking for user session...")
  
  const user = await getServerUser()

  if (!user) {
    console.log("[DASHBOARD] ❌ NO USER FOUND")
    console.log("[DASHBOARD] Reason: getServerUser() returned null")
    console.log("[DASHBOARD] Redirecting to /auth/login")
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    // Only redirect if we're sure there's no user
    // Don't redirect if there's an error - let the page handle it
    redirect("/auth/login")
  }

  console.log("[DASHBOARD] ✅ USER FOUND")
  console.log("[DASHBOARD] User ID:", user.id)
  console.log("[DASHBOARD] User Email:", user.email)
  console.log("[DASHBOARD] ✅ RENDERING DASHBOARD")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  return <DashboardClient user={user} />
}
