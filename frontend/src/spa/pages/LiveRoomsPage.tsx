import { FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ArrowRight, DoorOpen, Plus, Users } from 'lucide-react'
import { PURPOSE_LABEL, RoomView } from '../../features/live-rooms/RoomView'
import { useCreateLiveRoom, useJoinLiveRoom, useLiveRooms } from '../../shared/api/liveRooms'
import type { LiveRoomPurpose } from '../../shared/api/types'
import { Button, EmptyState, ErrorState, SegmentedTabs, Skeleton, Spinner, useToast } from '../../shared/ui'
import { routes } from '../routes'
import '../../features/live-rooms/live-rooms.css'

const PURPOSES: { value: LiveRoomPurpose; label: string }[] = [
  { value: 'reading', label: 'Kitap okuma' },
  { value: 'study', label: 'Ders çalışma' },
  { value: 'other', label: 'Diğer' },
]

function CreateRoom() {
  const create = useCreateLiveRoom()
  const navigate = useNavigate()
  const { notify } = useToast()
  const [title, setTitle] = useState('')
  const [purpose, setPurpose] = useState<LiveRoomPurpose>('reading')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (title.trim().length < 2) return notify('Odaya en az iki harfli bir ad ver.', 'info')
    create.mutate({ title: title.trim(), purpose }, {
      onSuccess: (room) => navigate(`${routes.liveRooms}?oda=${room.id}`),
      onError: (error) => notify(error.message, 'error'),
    })
  }
  return (
    <form className="live-card" onSubmit={submit} aria-labelledby="live-create-title">
      <h2 id="live-create-title"><Plus size={18} aria-hidden="true" /> Oda aç</h2>
      <label className="mh-field">
        <span>Odanın adı</span>
        <input className="mh-input" value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} placeholder="Örn. Final haftası, Gece okuması" />
      </label>
      <SegmentedTabs label="Oda türü" value={purpose} onChange={setPurpose} options={PURPOSES} />
      <Button type="submit" loading={create.isPending}>Odayı aç</Button>
    </form>
  )
}

function JoinRoom() {
  const join = useJoinLiveRoom()
  const navigate = useNavigate()
  const { notify } = useToast()
  const [code, setCode] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!code.trim()) return
    join.mutate(code.trim(), {
      onSuccess: (room) => navigate(`${routes.liveRooms}?oda=${room.id}`),
      onError: (error) => notify(error.message, 'error'),
    })
  }
  return (
    <form className="live-card" onSubmit={submit} aria-labelledby="live-join-title">
      <h2 id="live-join-title"><DoorOpen size={18} aria-hidden="true" /> Davet koduyla katıl</h2>
      <label className="mh-field">
        <span>Davet kodu</span>
        <input className="mh-input live-code" value={code} maxLength={20} onChange={(event) => setCode(event.target.value)} placeholder="ABCD2345" autoCapitalize="characters" />
      </label>
      <Button type="submit" variant="secondary" loading={join.isPending}>Katıl</Button>
    </form>
  )
}

function MyRooms() {
  const rooms = useLiveRooms()
  if (rooms.isPending) return <Skeleton height={120} />
  if (rooms.isError) return <ErrorState message={rooms.error.message} onRetry={() => rooms.refetch()} />
  if (rooms.data.length === 0) {
    return <EmptyState icon={<Users size={28} />} title="Henüz bir odan yok" description="Bir oda aç ve davet bağlantısını arkadaşlarına gönder; aynı anda okuyup çalışırken birbirinizi görün ve yazışın." />
  }
  return (
    <ul className="live-list">
      {rooms.data.map((room) => (
        <li key={room.id}>
          <Link to={`${routes.liveRooms}?oda=${room.id}`} className="live-list__item">
            <span className="live-pill">{PURPOSE_LABEL[room.purpose]}</span>
            <strong>{room.title}</strong>
            <small>{room.present_count ? `${room.present_count} kişi şu an odada` : 'Şu an kimse yok'} · {room.member_count} üye{room.role === 'owner' ? ' · senin odan' : ''}</small>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** Davet bağlantısıyla gelen kişiyi odaya katar ve odaya götürür. */
function AcceptInvite({ code }: { code: string }) {
  const join = useJoinLiveRoom()
  const navigate = useNavigate()
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    join.mutate(code, { onSuccess: (room) => navigate(`${routes.liveRooms}?oda=${room.id}`, { replace: true }) })
  }, [code, join, navigate])
  if (join.isError) {
    return <ErrorState title="Odaya katılamadın" message={<>{join.error.message} <Link to={routes.liveRooms}>Odalara dön</Link></>} />
  }
  return <Spinner />
}

export default function LiveRoomsPage() {
  const [params] = useSearchParams()
  const roomId = params.get('oda')
  const invite = params.get('davet')
  if (roomId) return <RoomView key={roomId} roomId={roomId} />
  if (invite) return <AcceptInvite code={invite} />
  return (
    <div className="page live-rooms">
      <header className="page-header">
        <div>
          <h1>Canlı odalar</h1>
          <p>Arkadaşlarınla aynı anda kitap oku ya da ders çalış. Kamera ve mikrofon yok: kimin odada olduğunu ve ne yaptığını görürsün, mola verince yazışırsınız.</p>
        </div>
      </header>
      <div className="live-forms">
        <CreateRoom />
        <JoinRoom />
      </div>
      <section aria-labelledby="live-mine-title" className="live-mine">
        <h2 id="live-mine-title">Odaların</h2>
        <MyRooms />
      </section>
    </div>
  )
}
