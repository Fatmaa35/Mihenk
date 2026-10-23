import { FormEvent, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Bell, BellRing, Check, Pencil, Tag, Trash2 } from 'lucide-react'
import {
  useDeletePriceAlert, useEnablePush, useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications,
  usePriceAlerts, usePushCapabilities, useUpsertPriceAlert,
} from '../../shared/api/alerts'
import type { PriceAlert } from '../../shared/api/types'
import { BookCover, Button, EmptyState, ErrorState, IconButton, SegmentedTabs, Skeleton, useToast } from '../../shared/ui'
import { formatMoney, formatRelative } from '../format'
import { routes } from '../routes'
import './pages.css'
import './notifications-page.css'

type Tab = 'bildirimler' | 'alarmlar'

function PushButton() {
  const capabilities = usePushCapabilities()
  const enable = useEnablePush()
  const { notify } = useToast()
  const supported = typeof window !== 'undefined' && 'PushManager' in window
  if (!supported || !capabilities.data?.push || !capabilities.data.vapid_public_key) return null
  const granted = typeof Notification !== 'undefined' && Notification.permission === 'granted'
  return (
    <Button
      variant="secondary"
      size="sm"
      icon={<BellRing size={16} aria-hidden="true" />}
      loading={enable.isPending}
      disabled={granted && enable.isSuccess}
      onClick={() => enable.mutate(capabilities.data!.vapid_public_key!, {
        onSuccess: () => notify('Bu cihazda anlık bildirimler açıldı.', 'success'),
        onError: (error) => notify(error.message, 'error'),
      })}
    >
      {enable.isSuccess ? 'Anlık bildirim açık' : 'Anlık bildirimleri aç'}
    </Button>
  )
}

function NotificationList() {
  const notifications = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()
  const unread = notifications.data?.filter((item) => !item.read_at).length ?? 0

  if (notifications.isPending) return <div className="stack">{[0, 1, 2].map((index) => <Skeleton key={index} height={76} radius={18} />)}</div>
  if (notifications.isError) return <ErrorState message={notifications.error.message} onRetry={() => notifications.refetch()} />
  if (!notifications.data.length) {
    return <EmptyState icon={<Bell size={28} />} title="Yeni bildirim yok" description="Fiyat düşüşleri, okuma hatırlatmaları ve topluluk gelişmeleri burada görünecek." />
  }
  return (
    <div className="stack">
      <div className="list-toolbar">
        <span className="today__muted">{unread ? `${unread} okunmamış bildirim` : 'Hepsini okudun'}</span>
        {unread > 0 && <Button size="sm" variant="ghost" loading={markAll.isPending} onClick={() => markAll.mutate()}>Tümünü okundu işaretle</Button>}
      </div>
      <ul className="notification-list">
        {notifications.data.map((item) => (
          <li key={item.id} className={`notification${item.read_at ? '' : ' is-unread'}`}>
            <span className="notification__dot" aria-hidden="true" />
            <div className="notification__body">
              <strong>{item.title}</strong>
              <p>{item.body}</p>
              <time dateTime={item.created_at}>{formatRelative(item.created_at)}</time>
            </div>
            {!item.read_at && (
              <IconButton label={`${item.title} bildirimini okundu işaretle`} icon={<Check size={18} />} onClick={() => markRead.mutate(item.id)} disabled={markRead.isPending} />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function AlertRow({ alert }: { alert: PriceAlert }) {
  const [editing, setEditing] = useState(false)
  const upsert = useUpsertPriceAlert()
  const remove = useDeletePriceAlert()
  const { notify } = useToast()
  const reached = alert.current_price_minor != null && alert.current_price_minor <= alert.target_price_minor

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = Number(String(new FormData(event.currentTarget).get('target')).replace(',', '.'))
    upsert.mutate({ book_id: alert.book_id, target_price_minor: Math.round(value * 100) }, {
      onSuccess: () => { notify('Hedef fiyat güncellendi.', 'success'); setEditing(false) },
      onError: (error) => notify(error.message, 'error'),
    })
  }

  return (
    <li className={`alert-row${reached ? ' is-reached' : ''}`}>
      <BookCover id={alert.book_id} title={alert.title} author={alert.author ?? undefined} coverUrl={alert.cover_url} size="sm" />
      <div className="alert-row__body">
        <h3>{alert.title}</h3>
        {alert.author && <p className="today__muted">{alert.author}</p>}
        {editing ? (
          <form className="alert-row__form" onSubmit={save}>
            <label className="visually-hidden" htmlFor={`target-${alert.book_id}`}>Hedef fiyat (TL)</label>
            <input id={`target-${alert.book_id}`} name="target" className="mh-input" type="number" min={1} step="0.01" inputMode="decimal" defaultValue={(alert.target_price_minor / 100).toFixed(2)} required autoFocus />
            <Button type="submit" size="sm" loading={upsert.isPending}>Kaydet</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Vazgeç</Button>
          </form>
        ) : (
          <dl className="alert-row__prices">
            <div><dt>Hedef</dt><dd>{formatMoney(alert.target_price_minor, alert.currency)}</dd></div>
            <div><dt>En iyi teklif</dt><dd>{alert.current_price_minor == null ? 'Henüz yok' : formatMoney(alert.current_price_minor, alert.currency)}</dd></div>
          </dl>
        )}
        {reached && <span className="mh-chip">Hedefin altında</span>}
      </div>
      {!editing && (
        <div className="alert-row__actions">
          <IconButton label="Hedef fiyatı değiştir" icon={<Pencil size={18} />} onClick={() => setEditing(true)} />
          <IconButton
            label="Alarmı sil"
            icon={<Trash2 size={18} />}
            disabled={remove.isPending}
            onClick={() => remove.mutate(alert.book_id, { onSuccess: () => notify('Fiyat alarmı silindi.', 'success'), onError: (error) => notify(error.message, 'error') })}
          />
        </div>
      )}
    </li>
  )
}

function AlertList() {
  const alerts = usePriceAlerts()
  if (alerts.isPending) return <div className="stack">{[0, 1].map((index) => <Skeleton key={index} height={110} radius={26} />)}</div>
  if (alerts.isError) return <ErrorState message={alerts.error.message} onRetry={() => alerts.refetch()} />
  if (!alerts.data.length) {
    return (
      <EmptyState
        icon={<Tag size={28} />}
        title="Henüz fiyat alarmın yok"
        description="Bir kitabın ayrıntılarından hedef fiyat belirle; mağazalarda o fiyatın altına düştüğünde sana haber verelim."
        action={<Link className="mh-button mh-button--secondary mh-button--md" to={routes.discover}>Kitap seç</Link>}
      />
    )
  }
  return <ul className="alert-list">{alerts.data.map((alert) => <AlertRow key={alert.book_id} alert={alert} />)}</ul>
}

export default function NotificationsPage() {
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('sekme') === 'alarmlar' ? 'alarmlar' : 'bildirimler'
  return (
    <div className="page notifications">
      <header className="page-header">
        <div>
          <h1>Bildirimler</h1>
          <p>Hatırlatmalar, topluluk gelişmeleri ve takip ettiğin kitapların fiyatları.</p>
        </div>
        <PushButton />
      </header>
      <SegmentedTabs
        label="Bildirim türü"
        value={tab}
        onChange={(value) => setParams(value === 'bildirimler' ? {} : { sekme: value }, { replace: true })}
        options={[{ value: 'bildirimler', label: 'Bildirimler' }, { value: 'alarmlar', label: 'Fiyat alarmları' }]}
      />
      <div role="tabpanel">{tab === 'bildirimler' ? <NotificationList /> : <AlertList />}</div>
    </div>
  )
}
