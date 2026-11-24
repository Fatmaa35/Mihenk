import { useEffect, useRef, useState } from 'react'
import './model3d.css'

/**
 * Üç boyutlu süs öğesi.
 *
 * Model dosyası (`.glb`) varsa döndürülebilir bir model, yoksa aynı görselin
 * durağan hâli gösterilir; ikisi de aynı yeri kapladığı için sayfa düzeni
 * değişmez. Model-viewer kütüphanesi yalnızca öğe ekrana girince indirilir
 * (yaklaşık 1 MB), böylece açılış hızına dokunmaz.
 *
 * Hareketi azalt tercihi açıkken model kendiliğinden dönmez.
 */

// React 19'da JSX ad alanı react modülünün içinde; özel etiket oraya tanıtılır.
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string
        poster?: string
        alt?: string
        'camera-controls'?: boolean
        'auto-rotate'?: boolean
        'disable-zoom'?: boolean
        'interaction-prompt'?: string
        'shadow-intensity'?: string
        'rotation-per-second'?: string
        exposure?: string
        reveal?: string
      }
    }
  }
}

let loader: Promise<unknown> | null = null
const loadViewer = () => {
  loader ??= import('@google/model-viewer')
  return loader
}

export function Model3D({ name, alt, size = 'm', interactive = false }: {
  /** `public/3b/` altındaki dosya adı; `<name>.glb` ve `<name>.png` beklenir. */
  name: string
  alt: string
  size?: 's' | 'm' | 'l'
  interactive?: boolean
}) {
  const host = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  // Varlıklar `base` yolunun altından sunulur (/static/generated/).
  const asset = (extension: string) => `${import.meta.env.BASE_URL}3b/${name}.${extension}`
  const poster = asset('png')

  useEffect(() => {
    const element = host.current
    if (!element || failed) return
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer.disconnect()
      loadViewer().then(() => setReady(true)).catch(() => setFailed(true))
    }, { rootMargin: '200px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [failed])

  const reduced = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  return (
    <div ref={host} className={`model3d model3d--${size}`} data-ready={ready}>
      {ready && !failed ? (
        <model-viewer
          src={asset('glb')}
          poster={poster}
          alt={alt}
          auto-rotate={!reduced}
          rotation-per-second="18deg"
          camera-controls={interactive}
          disable-zoom
          interaction-prompt="none"
          shadow-intensity="0.6"
          exposure="1.05"
          reveal="auto"
          onError={() => setFailed(true)}
        />
      ) : (
        <img src={poster} alt={alt} loading="lazy" decoding="async" />
      )}
    </div>
  )
}
