import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react'

type ToastTone = 'info' | 'success' | 'error'
type ToastItem = { id: number; message: string; tone: ToastTone }
type ToastContextValue = { notify: (message: string, tone?: ToastTone) => void }

const ToastContext = createContext<ToastContextValue>({ notify: () => undefined })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)
  const notify = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = nextId.current++
    setItems((current) => [...current.slice(-2), { id, message, tone }])
    window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 4200)
  }, [])
  const value = useMemo(() => ({ notify }), [notify])
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="mh-toasts" aria-live="polite" aria-atomic="false">
        {items.map((item) => (
          <div key={item.id} className={`mh-toast mh-toast--${item.tone}`} role={item.tone === 'error' ? 'alert' : 'status'}>
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
