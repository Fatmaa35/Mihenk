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
        'camera-orbit'?: string
        'min-camera-orbit'?: string
        'max-camera-orbit'?: string
        'interpolation-decay'?: string
        'disable-zoom'?: boolean
        'interaction-prompt'?: string
        'shadow-intensity'?: string
        exposure?: string
        reveal?: string
      }
    }
  }
}

/** Salınımın iki yana açısı ve bir turunun süresi. */
const SALINIM_ACISI = 26
const SALINIM_SURESI = 9000

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

  // Modeller düz görselden çıkarılmış kabartmalar: yandan bakınca incelirler.
  // Bu yüzden tam tur dönmek yerine iki yana hafifçe salınıyorlar. Görüntüleyici
  // verilen açıya kendisi yumuşak geçiş yaptığı için saniyede birkaç adım yeter.
  useEffect(() => {
    const viewer = host.current?.querySelector('model-viewer') as HTMLElement | null
    if (!ready || failed || reduced || interactive || !viewer) return
    const basladi = performance.now()
    const zamanlayici = window.setInterval(() => {
      if (document.hidden) return
      const faz = (performance.now() - basladi) / SALINIM_SURESI
      viewer.setAttribute('camera-orbit', `${(Math.sin(faz * 2 * Math.PI) * SALINIM_ACISI).toFixed(1)}deg 76deg auto`)
    }, 140)
    return () => window.clearInterval(zamanlayici)
  }, [ready, failed, reduced, interactive])

  return (
    <div ref={host} className={`model3d model3d--${size}`} data-ready={ready}>
      {ready && !failed ? (
        <model-viewer
          src={asset('glb')}
          poster={poster}
          alt={alt}
          camera-controls={interactive}
          min-camera-orbit={`-${SALINIM_ACISI}deg 60deg auto`}
          max-camera-orbit={`${SALINIM_ACISI}deg 92deg auto`}
          interpolation-decay="260"
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
