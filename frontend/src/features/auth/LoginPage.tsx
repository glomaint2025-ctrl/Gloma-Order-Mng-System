import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { login } from '@/api/auth'
import { useAuth } from '@/app/authContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { LogIn, AlertCircle } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const { refreshMe } = useAuth()
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null)
    setIsSubmitting(true)
    try {
      const me = await login(values)
      await refreshMe()

      if (me.is_admin) {
        navigate('/admin/dashboard')
      } else if (me.shops.length === 1) {
        navigate(`/shops/${me.shops[0].id}/dashboard`)
      } else {
        navigate('/shops')
      }
    } catch (err: any) {
      if (err.response?.status === 429) {
        setServerError(err.response?.data?.message || 'Too many attempts. Please try again later.')
      } else if (err.response?.status === 422) {
        setServerError(err.response?.data?.errors?.email?.[0] || err.response?.data?.message || 'Wrong email or password.')
      } else {
        setServerError(err.response?.data?.message || 'Sign in failed. Check your connection.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
            G
          </div>
        </div>
        <h2 className="text-center text-2xl font-bold tracking-tight text-gray-900">
          Gloma Shop Portal
        </h2>
        <p className="mt-1 text-center text-xs text-gray-500">
          Sign in to your shop back-office account
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm rounded-xl border border-gray-200/80 sm:px-10">
          {serverError && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isSubmitting}
                icon={<LogIn className="w-4 h-4" />}
              >
                Log in
              </Button>
            </div>
          </form>

          <div className="mt-6 border-t border-gray-100 pt-4 text-center">
            <span className="text-[11px] text-gray-400">
              Gloma Business Solutions &bull; Authorized Staff & Partners Only
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
