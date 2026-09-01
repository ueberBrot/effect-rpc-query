import { useMutation } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'

import type { ViteReactApplication } from '../../lib/application.ts'
import { ActionButton } from '../ui/action-button.tsx'
import { EffectErrorDetails } from '../ui/effect-error-details.tsx'

export const CreateUserForm = ({ application }: { readonly application: ViteReactApplication }) => {
  const { queryClient, rpc } = application
  const [locale, setLocale] = useState('')
  const [name, setName] = useState('')
  const createUser = useMutation(
    rpc.users.create.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: rpc.users.key() }),
    }),
  )

  const submitUser = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const userName = name.trim()
    const userLocale = locale.trim()
    if (userName.length === 0) return

    createUser.mutate(
      {
        name: userName,
        ...(userLocale.length === 0 ? {} : { locale: userLocale }),
      },
      {
        onSuccess: () => {
          setLocale('')
          setName('')
        },
      },
    )
  }

  return (
    <>
      <form
        className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,0.65fr)_auto] md:items-end"
        onSubmit={submitUser}
      >
        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
          Name
          <input
            className="min-w-0 rounded-lg border border-emerald-300 bg-white px-3 py-2.5 text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-3 focus:ring-emerald-200"
            onChange={(event) => setName(event.currentTarget.value)}
            required
            value={name}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
          Locale (optional)
          <input
            className="min-w-0 rounded-lg border border-emerald-300 bg-white px-3 py-2.5 text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-3 focus:ring-emerald-200"
            onChange={(event) => setLocale(event.currentTarget.value)}
            placeholder="en"
            value={locale}
          />
        </label>
        <ActionButton disabled={createUser.isPending} type="submit">
          {createUser.isPending ? 'Adding user...' : 'Add user'}
        </ActionButton>
      </form>
      {createUser.data === undefined ? null : (
        <p className="text-sm">Added {createUser.data.name}</p>
      )}
      <EffectErrorDetails error={createUser.error} />
    </>
  )
}
