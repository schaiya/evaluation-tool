"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function GoogleAuthButtons() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session)
    })
  }, [])

  const handleLogin = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        console.error("Error signing in with Google:", error)
        setLoading(false)
      }
    } catch (error) {
      console.error("Unexpected error during Google sign-in:", error)
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error("Error signing out:", error)
        return
      }

      setHasSession(false)
      router.replace("/login")
      router.refresh()
    } catch (error) {
      console.error("Unexpected error during sign-out:", error)
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleLogin}
        disabled={loading}
        className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
      >
        {loading ? "Redirecting to Google..." : "Sign in with Google"}
      </button>

      {hasSession && (
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex w-full items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Sign out
        </button>
      )}
    </div>
  )
}

