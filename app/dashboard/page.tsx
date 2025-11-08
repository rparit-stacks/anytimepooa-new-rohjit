import { redirect } from "next/navigation"
import { getServerUser } from "@/lib/server"
import { DashboardClient } from "@/components/dashboard-client"
import { cookies } from "next/headers"

export default async function DashboardPage() {
  try {
    console.log(`[DASHBOARD] START | Loading dashboard page...`)
    
    // Debug: Check cookies directly
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session_token")?.value
    const allCookies = cookieStore.getAll()
    console.log(`[DASHBOARD] COOKIE_CHECK | Token: ${sessionToken ? `EXISTS (${sessionToken.substring(0, 16)}...)` : "MISSING"} | CookieCount: ${allCookies.length}`)
    
    const user = await getServerUser()

    if (!user) {
      console.log(`[DASHBOARD] RESULT: NO_USER | Redirecting to /auth/login`)
      redirect("/auth/login")
    }

    console.log(`[DASHBOARD] RESULT: USER_FOUND | ID=${user.id} | Email=${user.email} | Rendering dashboard`)
    return <DashboardClient user={user} />
  } catch (error: any) {
    console.error(`[DASHBOARD] ERROR | ${error?.message || "Unknown error"}`)
    // Don't redirect on error - let it fail gracefully
    throw error
  }
}
