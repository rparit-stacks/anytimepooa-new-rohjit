"use client"

// Client-side function to check if user is logged in
export async function checkSession(): Promise<boolean> {
  try {
    const response = await fetch("/api/user/profile", {
      method: "GET",
      credentials: "include",
    })
    return response.ok
  } catch (error) {
    return false
  }
}

// Get user data from client
export async function getClientUser() {
  try {
    const response = await fetch("/api/user/profile", {
      method: "GET",
      credentials: "include",
    })
    if (response.ok) {
      const data = await response.json()
      return data.data
    }
    return null
  } catch (error) {
    return null
  }
}


