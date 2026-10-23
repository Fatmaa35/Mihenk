import { FormEvent, useEffect, useState } from 'react'
import { BadgeCheck, Ban, Search, UserPlus } from 'lucide-react'
import { AdminUser, useAdminUsers, useBanUser, useInviteUser, useSetUserRole, useVerifyUser } from '../../shared/api/admin'
import { Button, Dialog, EmptyState, ErrorState, Skeleton, useToast } from '../../shared/ui'
import { formatRelative, initials } from '../../spa/format'
import { useSession } from '../../spa/layout/SessionGate'

const ROLE_LABELS = { user: 'Okur', editor: 'Editör', admin: 'Yönetici' } as const

function BanDialog({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  const ban = useBanUser()
  const { notify } = useToast()
  const [error, setError] = useState('')
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) return
    const form = new FormData(event.currentTarget)
    const days = String(form.get('days'))
    ban.mutate(
      { id: user.id, banned: true, reason: String(form.get('reason')).trim(), duration_days: days ? Number(days) : null },
      { onSuccess: () => { notify(`${user.display_name} askıya alındı.`, 'success'); onClose() }, onError: (failure) => setError(failure.message) },
    )
  }
  return (
    <Dialog open={Boolean(user)} title={user ? `${user.display_name} askıya alınsın mı?` : ''} size="sm" onClose={() => { setError(''); onClose() }}>
      <form className="settings-form" onSubmit={submit}>
        <label className="mh-field">
          <span>Gerekçe</span>
          <textarea className="mh-input mh-textarea" name="reason" required minLength={3} maxLength={500} rows={3} />
          <small>Kullanıcı giriş yaptığında bu gerekçeyi görür.</small>
        </label>
        <label className="mh-field">
          <span>Süre</span>
          <select className="mh-input" name="days" defaultValue="7">
            <option value="1">1 gün</option><option value="7">7 gün</option><option value="30">30 gün</option><option value="">Süresiz</option>
          </select>
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="progress-form__actions">
          <Button variant="ghost" onClick={onClose}>Vazgeç</Button>
          <Button type="submit" variant="danger" loading={ban.isPending}>Askıya al</Button>
        </div>
      </form>
    </Dialog>
  )
}

function InviteForm() {
  const invite = useInviteUser()
  const { notify } = useToast()
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    invite.mutate(
      { display_name: String(form.get('name')).trim(), email: String(form.get('email')).trim() },
      { onSuccess: (data) => { formElement.reset(); notify(data.message, 'success') }, onError: (error) => notify(error.message, 'error') },
    )
  }
  return (
    <form className="admin-invite" onSubmit={submit}>
      <label className="mh-field"><span>Ad soyad</span><input className="mh-input" name="name" minLength={2} maxLength={80} required autoComplete="off" /></label>
      <label className="mh-field"><span>E-posta</span><input className="mh-input" name="email" type="email" maxLength={254} required autoComplete="off" /></label>
      <Button type="submit" variant="secondary" loading={invite.isPending} icon={<UserPlus size={16} aria-hidden="true" />}>Davet gönder</Button>
    </form>
  )
}

function UserRow({ user, self, onBan }: { user: AdminUser; self: boolean; onBan: () => void }) {
  const verify = useVerifyUser()
  const unban = useBanUser()
  const role = useSetUserRole()
  const { notify } = useToast()
  const fail = (error: Error) => notify(error.message, 'error')
  return (
    <li className={`admin-user${user.is_banned ? ' is-banned' : ''}`}>
      <span className="feed-card__avatar" aria-hidden="true">{initials(user.display_name)}</span>
      <div className="admin-user__body">
        <strong>{user.display_name}{user.is_verified && <BadgeCheck size={15} className="comment__verified" aria-label="Doğrulanmış" />}</strong>
        <span>{user.email ?? 'e-posta yok'}</span>
        <small>
          {formatRelative(user.created_at)} katıldı · {user.comment_count} yorum · {user.rating_count} puan
          {user.is_banned && ` · askıda${user.banned_until ? ` (${new Date(user.banned_until).toLocaleDateString('tr-TR')} tarihine kadar)` : ''}`}
        </small>
      </div>
      <div className="admin-user__actions">
        <label className="visually-hidden" htmlFor={`role-${user.id}`}>{user.display_name} rolü</label>
        <select id={`role-${user.id}`} className="admin-select" value={user.app_role} disabled={self || role.isPending}
          onChange={(event) => role.mutate({ id: user.id, role: event.target.value as 'user' | 'editor' | 'admin' }, { onSuccess: () => notify('Rol güncellendi.', 'success'), onError: fail })}>
          {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <Button size="sm" variant="ghost" loading={verify.isPending}
          onClick={() => verify.mutate({ id: user.id, verified: !user.is_verified, label: user.is_verified ? null : 'Doğrulanmış okur' }, { onError: fail })}>
          {user.is_verified ? 'Doğrulamayı kaldır' : 'Doğrula'}
        </Button>
        {!self && (user.is_banned ? (
          <Button size="sm" variant="secondary" loading={unban.isPending} onClick={() => unban.mutate({ id: user.id, banned: false, reason: null, duration_days: null }, { onSuccess: () => notify('Askı kaldırıldı.', 'success'), onError: fail })}>Askıyı kaldır</Button>
        ) : (
          <Button size="sm" variant="danger" icon={<Ban size={14} aria-hidden="true" />} onClick={onBan}>Askıya al</Button>
        ))}
      </div>
    </li>
  )
}

export function UsersTab() {
  const { user: me } = useSession()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [banning, setBanning] = useState<AdminUser | null>(null)
  useEffect(() => { const timer = window.setTimeout(() => setDebounced(query.trim()), 300); return () => window.clearTimeout(timer) }, [query])
  const users = useAdminUsers(debounced)
  return (
    <div className="admin-stack">
      <section className="admin-panel">
        <header className="admin-panel__head"><h2>Kullanıcı davet et</h2></header>
        <p className="today__muted">Kullanıcılar doğrudan kayıt olabilir; davet e-postası yalnızca Supabase ortamında gönderilir.</p>
        <InviteForm />
      </section>
      <section className="admin-panel">
        <header className="admin-panel__head">
          <h2>Kullanıcılar</h2>
          <label className="admin-search">
            <Search size={16} aria-hidden="true" />
            <span className="visually-hidden">Kullanıcı ara</span>
            <input type="search" placeholder="Ad veya e-posta ara" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
        </header>
        {users.isPending && <Skeleton height={200} />}
        {users.isError && <ErrorState message={users.error.message} onRetry={() => users.refetch()} />}
        {users.data && users.data.length === 0 && <EmptyState title="Kullanıcı bulunamadı" description={`“${debounced}” ile eşleşen kullanıcı yok.`} />}
        <ul className="admin-users">
          {users.data?.map((user) => <UserRow key={user.id} user={user} self={user.id === me.id} onBan={() => setBanning(user)} />)}
        </ul>
      </section>
      <BanDialog user={banning} onClose={() => setBanning(null)} />
    </div>
  )
}
