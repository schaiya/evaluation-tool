import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { GoogleAuthButtons } from "./GoogleAuthButtons"

export default async function LoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl border border-slate-200 p-8 space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
          <p className="text-sm text-slate-600">
            Use your Google account to access the Impact Evaluation Tool dashboard.
          </p>
        </div>

        <GoogleAuthButtons />

        <p className="text-xs text-slate-500 text-center">
          By continuing, you agree to the evaluation workspace using your authenticated Supabase session.
        </p>
      </div>
    </div>
  )
}

