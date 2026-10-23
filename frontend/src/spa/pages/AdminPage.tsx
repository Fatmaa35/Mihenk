import { useSearchParams } from 'react-router'
import { ShieldAlert } from 'lucide-react'
import { CatalogTab } from '../../features/admin/CatalogTab'
import { OverviewTab } from '../../features/admin/OverviewTab'
import { PipelineTab } from '../../features/admin/PipelineTab'
import { QualityTab } from '../../features/admin/QualityTab'
import { ReportsTab } from '../../features/admin/ReportsTab'
import { UsersTab } from '../../features/admin/UsersTab'
import { EmptyState, SegmentedTabs } from '../../shared/ui'
import { useSession } from '../layout/SessionGate'
import '../../features/admin/admin.css'
import '../../features/community/community.css'
import './pages.css'
import './settings-page.css'

type Tab = 'genel' | 'kullanicilar' | 'sikayetler' | 'katalog' | 'fiyat' | 'kalite'

const TABS: { value: Tab; label: string; roles: string[] }[] = [
  { value: 'genel', label: 'Genel bakış', roles: ['admin'] },
  { value: 'kullanicilar', label: 'Kullanıcılar', roles: ['admin'] },
  { value: 'sikayetler', label: 'Şikâyetler', roles: ['admin'] },
  { value: 'katalog', label: 'Katalog', roles: ['admin', 'editor'] },
  { value: 'fiyat', label: 'Fiyat hattı', roles: ['admin'] },
  { value: 'kalite', label: 'Kalite', roles: ['admin', 'editor'] },
]

export default function AdminPage() {
  const { user } = useSession()
  const [params, setParams] = useSearchParams()
  const allowed = TABS.filter((tab) => tab.roles.includes(user.app_role))
  if (!allowed.length) {
    return <EmptyState icon={<ShieldAlert size={28} />} title="Bu bölüm yöneticilere özel" description="Yönetim paneline erişim için hesabına yönetici veya editör rolü verilmesi gerekir." />
  }
  const requested = params.get('sekme') as Tab | null
  const tab = allowed.find((item) => item.value === requested)?.value ?? allowed[0].value
  return (
    <div className="page admin">
      <header className="page-header">
        <div>
          <h1>Yönetim</h1>
          <p>Kullanıcılar, topluluk güvenliği, katalog kalitesi ve veri hatları.</p>
        </div>
      </header>
      <SegmentedTabs label="Yönetim bölümü" value={tab} onChange={(value) => setParams(value === allowed[0].value ? {} : { sekme: value }, { replace: true })} options={allowed} />
      <div role="tabpanel">
        {tab === 'genel' && <OverviewTab />}
        {tab === 'kullanicilar' && <UsersTab />}
        {tab === 'sikayetler' && <ReportsTab />}
        {tab === 'katalog' && <CatalogTab />}
        {tab === 'fiyat' && <PipelineTab />}
        {tab === 'kalite' && <QualityTab />}
      </div>
    </div>
  )
}
