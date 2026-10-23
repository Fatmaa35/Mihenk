import { lazy, Suspense } from 'react'
import { Spinner } from '../../shared/ui'
import { ErrorBoundary } from '../../spa/layout/ErrorBoundary'
import '../../styles/product-ui.css'

// Kulüp çalışma alanı mevcut React modülünden gelir; yeni tasarım token'ları `.embedded-module` ile aktarılır.
const ProductGrowthHub = lazy(() => import('./ProductGrowthHub').then((module) => ({ default: module.ProductGrowthHub })))

export function ClubsPanel() {
  return (
    <div className="embedded-module embedded-module--clubs">
      <ErrorBoundary>
        <Suspense fallback={<Spinner label="Kulüpler yükleniyor" />}>
          <ProductGrowthHub />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
