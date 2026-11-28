import { useEffect, useState } from 'react'
import { AssistantPanel } from './AssistantPanel'
import './assistant.css'

/** Her sayfada sağ altta duran asistan düğmesi; panel ilk açılışta yüklenir. */
export default function AssistantLauncher() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { if (open) setMounted(true) }, [open])
  return (
    <>
      {!open && (
        <button type="button" className="assistant-fab" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="assistant-panel" aria-label="Kitap asistanı">
          <img src={`${import.meta.env.BASE_URL}gorseller/baykus-ikon.png`} alt="" aria-hidden="true" width={34} height={34} />
          <span>Kitap asistanı</span>
        </button>
      )}
      {mounted && <AssistantPanel open={open} onClose={() => setOpen(false)} />}
    </>
  )
}
