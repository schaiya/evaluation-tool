"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const supabase = createClient()

    const handleCallback = async () => {
      // Trigger session exchange for PKCE-based OAuth flows.
      await supabase.auth.getSession()

      const redirectTo = searchParams.get("redirect_to") || "/"
      router.replace(redirectTo)
      router.refresh()
    }

    handleCallback().catch((error) => {
      console.error("Error handling auth callback:", error)
      router.replace("/")
    })
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <p className="text-sm text-slate-600">Completing sign-in with Google...</p>
    </div>
  )
}

