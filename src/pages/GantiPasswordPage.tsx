import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, Loader2, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { getApiError } from '@/api/client'
import { Field, PageHeader } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/auth'
import { safeNext } from '@/lib/redirect'
import {
  changePasswordDefaults,
  changePasswordSchema,
  PASSWORD_MIN_LENGTH,
  toChangePasswordPayload,
  type ChangePasswordValues,
} from '@/schemas/forms'

export default function GantiPasswordPage() {
  const { user, changePassword } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const forced = Boolean(user?.must_change_password)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: changePasswordDefaults,
  })

  const onSubmit = async (values: ChangePasswordValues) => {
    setError(null)
    const body = toChangePasswordPayload(values)
    try {
      await changePassword(body.current_password, body.new_password)
      toast.success('Password berhasil diganti')
      reset(changePasswordDefaults)
      if (forced || params.get('next')) navigate(safeNext(params.get('next')), { replace: true })
    } catch (err) {
      setError(getApiError(err, 'Gagal mengganti password'))
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Ganti Password" description="Ubah password akun yang sedang login." />
      {forced ? (
        <div
          role="alert"
          className="mb-4 flex gap-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning"
        >
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <p>
            Akun ini masih memakai password bawaan/sementara. Ganti password terlebih dahulu sebelum melanjutkan.
          </p>
        </div>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4" /> {user?.email}
          </CardTitle>
          <CardDescription>Password baru minimal {PASSWORD_MIN_LENGTH} karakter dan harus berbeda dari password saat ini.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Hidden username helps password managers pair the new password with this account. */}
            <input type="text" name="username" autoComplete="username" value={user?.email ?? ''} readOnly hidden />
            <Field label="Password saat ini" htmlFor="current_password" error={errors.current_password?.message}>
              <Input
                id="current_password"
                type="password"
                autoComplete="current-password"
                autoFocus
                {...register('current_password')}
              />
            </Field>
            <Field label="Password baru" htmlFor="new_password" error={errors.new_password?.message}>
              <Input id="new_password" type="password" autoComplete="new-password" {...register('new_password')} />
            </Field>
            <Field label="Ulangi password baru" htmlFor="confirm_password" error={errors.confirm_password?.message}>
              <Input
                id="confirm_password"
                type="password"
                autoComplete="new-password"
                {...register('confirm_password')}
              />
            </Field>
            {error ? <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto sm:justify-self-end">
              {isSubmitting ? <Loader2 className="animate-spin" /> : null}
              Simpan Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
