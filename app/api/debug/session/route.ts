import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/server"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session_token")?.value
    const allCookies = cookieStore.getAll()
    
    // Get user if session exists
    const user = await getCurrentUser()
    
    // Check session in database if token exists
    let sessionData = null
    if (sessionToken) {
      const supabase = await createClient()
      const { data: session, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("token", sessionToken)
        .single()
      
      sessionData = session
    }

    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV,
      },
      cookies: {
        sessionToken: sessionToken ? `${sessionToken.substring(0, 12)}...` : null,
        allCookies: allCookies.map(c => ({
          name: c.name,
          value: c.value.substring(0, 12) + "...",
          hasValue: !!c.value,
        })),
        cookieCount: allCookies.length,
      },
      session: {
        exists: !!sessionData,
        userId: sessionData?.user_id || null,
        expiresAt: sessionData?.expires_at || null,
        isExpired: sessionData ? new Date(sessionData.expires_at) < new Date() : null,
      },
      user: {
        exists: !!user,
        id: user?.id || null,
        email: user?.email || null,
      },
      request: {
        path: request.nextUrl.pathname,
        method: request.method,
        headers: {
          cookie: request.headers.get("cookie")?.substring(0, 100) || null,
          userAgent: request.headers.get("user-agent")?.substring(0, 50) || null,
        },
      },
    }

    return NextResponse.json(debugInfo, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

