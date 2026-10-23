import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
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
        <button type="button" className="assistant-fab" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="assistant-panel">
          <Sparkles size={18} aria-hidden="true" />
          <span>Kitap asistanı</span>
        </button>
      )}
      {mounted && <AssistantPanel open={open} onClose={() => setOpen(false)} />}
    </>
  )
}
