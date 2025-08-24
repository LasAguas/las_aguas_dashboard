import { useState } from "react"
import { supabase } from "../lib/supabaseClient"
import { useRouter } from "next/router"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const router = useRouter()
  
    async function handleLogin(e) {
        e.preventDefault()
        setError("")
      
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
      
        if (error) {
          setError(error.message)
        } else {
          const user = data.user
          console.log("Auth User UUID:", user?.id)
      
          // 🔍 Fetch the profile row for this user
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("id, role")
            .eq("id", user.id)
            .single()
      
          if (profileError) {
            console.error("Error fetching profile:", profileError.message)
            setError("Could not load profile")
          } else {
            console.log("Profile:", profile)
      
            // 🎯 Redirect based on role
            if (profile.role === "artist") {
              router.push("/artist-dashboard")
            } else if (profile.role === "las_aguas") {
              router.push("/")
            } else {
              // fallback if role is missing/unexpected
              router.push("/")
            }
          }
        }
      }
      

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#a89ee4]">
      <div className="w-full max-w-md bg-[#bbe1ac] p-8 rounded-2xl shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-'#33286a'-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-'#33286a'-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-'#33286a'-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[#599b40] text-[#33296b] py-2 px-4 rounded-md hover:bg-[#a89ee4] focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Login
          </button>
        </form>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  )
}
