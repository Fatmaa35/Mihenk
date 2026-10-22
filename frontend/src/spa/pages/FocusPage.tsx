import { lazy, Suspense } from 'react'
import { ErrorBoundary } from '../layout/ErrorBoundary'
import { Spinner } from '../../shared/ui'
import '../../styles/product-ui.css'
import './pages.css'

const BentoReadingDashboard = lazy(() => import('../../features/reading/BentoReadingDashboard').then((module) => ({ default: module.BentoReadingDashboard })))

export default function FocusPage() {
  return (
    <div className="page focus">
      <header className="page-header">
        <div>
          <h1>Okuma modu</h1>
          <p>Odak seansı başlat, alıntılarını kaydet ve yıllık okuma takvimini izle.</p>
        </div>
      </header>
      <div className="embedded-module">
        <ErrorBoundary>
          <Suspense fallback={<Spinner label="Okuma modu yükleniyor" />}>
            <BentoReadingDashboard />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  )
}
