import { lazy, Suspense } from 'react'
import { ErrorBoundary } from '../layout/ErrorBoundary'
import { Spinner } from '../../shared/ui'
import '../../styles/product-ui.css'
import './pages.css'

// Kulüp çalışma alanı mevcut React modülünden gelir; yeni tasarım token'ları `.embedded-module` ile aktarılır.
const ProductGrowthHub = lazy(() => import('../../features/growth/ProductGrowthHub').then((module) => ({ default: module.ProductGrowthHub })))

export default function ClubsPage() {
  return (
    <div className="page clubs">
      <header className="page-header">
        <div>
          <h1>Kulüpler</h1>
          <p>Birlikte okuyun, bölüm bölüm tartışın, etkinlik ve oylamalarla kulübünü canlı tut.</p>
        </div>
      </header>
      <div className="embedded-module">
        <ErrorBoundary>
          <Suspense fallback={<Spinner label="Kulüpler yükleniyor" />}>
            <ProductGrowthHub />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  )
}
