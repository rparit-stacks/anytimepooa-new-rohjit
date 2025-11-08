import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/server"
import { NextRequest } from "next/server"

const API_KEY = process.env.FREEASTROLOGY_API_KEY || "ekkc50gBkU2oK8s0FYWGS1bjYW2llYz08BvWZdnO"
const BASE_URL = "https://json.freeastrologyapi.com"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      year,
      month,
      date,
      hours,
      minutes,
      seconds = 0,
      latitude,
      longitude,
      timezone,
      horoscope_type = "vedic", // vedic or western
      chart_type = "planets", // planets, navamsa, hora, etc.
      observation_point = "topocentric",
      ayanamsha = "lahiri",
      language = "en",
      name,
    } = body

    // Validate required fields
    if (!year || !month || !date || !hours || minutes === undefined || !latitude || !longitude || !timezone) {
      return Response.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Prepare API request payload
    const apiPayload = {
      year: parseInt(year),
      month: parseInt(month),
      date: parseInt(date),
      hours: parseInt(hours),
      minutes: parseInt(minutes),
      seconds: parseInt(seconds),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timezone: parseFloat(timezone),
      config: {
        observation_point,
        ayanamsha: horoscope_type === "vedic" ? ayanamsha : "tropical",
        language,
      },
    }

    // Determine API endpoint based on type and chart
    let apiEndpoint = ""
    if (horoscope_type === "vedic") {
      if (chart_type === "planets") {
        apiEndpoint = `${BASE_URL}/vedic/planets`
      } else if (chart_type === "navamsa") {
        apiEndpoint = `${BASE_URL}/vedic/navamsa`
      } else if (chart_type === "hora") {
        apiEndpoint = `${BASE_URL}/vedic/hora`
      } else if (chart_type === "rasi") {
        apiEndpoint = `${BASE_URL}/vedic/rasi-chart-image-url`
      } else if (chart_type.startsWith("d") || chart_type.includes("chart")) {
        // For other divisional charts
        apiEndpoint = `${BASE_URL}/vedic/${chart_type}`
      } else {
        apiEndpoint = `${BASE_URL}/vedic/planets` // Default to planets
      }
    } else {
      // Western
      if (chart_type === "planets") {
        apiEndpoint = `${BASE_URL}/western/planets`
      } else {
        apiEndpoint = `${BASE_URL}/western/planets` // Default to planets for western
      }
    }
    
    console.log("[v0] Calling horoscope API:", apiEndpoint)
    console.log("[v0] API Payload:", JSON.stringify(apiPayload, null, 2))
    console.log("[v0] API Key present:", !!API_KEY, "Length:", API_KEY?.length)

    // Call FreeAstrologyAPI
    const headers = new Headers()
    headers.set("Content-Type", "application/json")
    headers.set("Accept", "application/json")
    headers.set("x-api-key", API_KEY)

    console.log("[v0] API Request Headers:", {
      "Content-Type": headers.get("Content-Type"),
      "Accept": headers.get("Accept"),
      "x-api-key": headers.get("x-api-key") ? "***present***" : "MISSING",
    })

    const apiResponse = await fetch(apiEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(apiPayload),
    })

    console.log("[v0] API Response Status:", apiResponse.status)
    
    const responseText = await apiResponse.text()
    console.log("[v0] API Response Body:", responseText.substring(0, 500))

    if (!apiResponse.ok) {
      let errorMessage = "Failed to generate horoscope"
      try {
        const errorJson = JSON.parse(responseText)
        errorMessage = errorJson.message || errorJson.error || errorMessage
      } catch {
        errorMessage = responseText || errorMessage
      }
      console.error("[v0] Horoscope API error:", responseText)
      return Response.json({ error: errorMessage }, { status: 400 })
    }

    let chartData
    try {
      chartData = JSON.parse(responseText)
    } catch (parseError) {
      console.error("[v0] Failed to parse API response:", parseError, "Response:", responseText.substring(0, 200))
      return Response.json({ error: "Invalid response from horoscope API" }, { status: 400 })
    }

    // Save to database
    const supabase = await createClient()
    const { data: horoscope, error: dbError } = await supabase
      .from("horoscopes")
      .insert({
        user_id: user.id,
        name: name || `Horoscope ${new Date().toLocaleDateString()}`,
        year: parseInt(year),
        month: parseInt(month),
        date: parseInt(date),
        hours: parseInt(hours),
        minutes: parseInt(minutes),
        seconds: parseInt(seconds),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        timezone: parseFloat(timezone),
        observation_point,
        ayanamsha: horoscope_type === "vedic" ? ayanamsha : "tropical",
        language,
        horoscope_type,
        chart_type,
        chart_data: chartData,
        chart_image_url: chartData.image_url || chartData.svg_url || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (dbError) {
      console.error("[v0] Database error:", dbError)
      return Response.json({ error: dbError.message }, { status: 400 })
    }

    return Response.json({ data: horoscope }, { status: 200 })
  } catch (err: any) {
    console.error("[v0] Generate horoscope error:", err)
    return Response.json({ error: err.message || "Failed to generate horoscope" }, { status: 500 })
  }
}

