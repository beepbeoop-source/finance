import React, { useState } from 'react'
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface LoginViewProps {
  onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    const cleanEmail = email.trim()
    if (!cleanEmail || !password.trim()) {
      setErrorMessage('Please enter your email and password.')
      return
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.')
      return
    }

    setIsLoading(true)
    try {
      const res = await onLogin(cleanEmail, password)
      if (!res.success) {
        setErrorMessage(res.error || 'Invalid credentials. Access restricted to authorized administrators.')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-black text-2xl shadow-md">
            S
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground uppercase">
            Syed Global Group
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
            Finance Management Suite
          </p>
        </div>

        {/* Card */}
        <Card className="border-border/60 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold">Administrator Sign In</CardTitle>
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <CardDescription className="text-xs">
              Access is restricted to authorized administrative personnel.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {errorMessage && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                  {errorMessage}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email or Username</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="text"
                    className="pl-9"
                    placeholder="admin@syedglobal.com or username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="pl-9 pr-9"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button type="submit" className="w-full gap-2" disabled={isLoading}>
                <LogIn className="w-4 h-4" />
                {isLoading ? 'Authenticating...' : 'Sign In as Administrator'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground">
          Protected with Supabase Auth RBAC & Row Level Security (RLS)
        </p>
      </div>
    </div>
  )
}
