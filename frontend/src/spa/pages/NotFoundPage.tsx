import { Link } from 'react-router'
import { Compass } from 'lucide-react'
import { EmptyState } from '../../shared/ui'
import { routes } from '../routes'

export default function NotFoundPage() {
  return (
    <EmptyState
      icon={<Compass size={28} />}
      title="Bu sayfayı bulamadık"
      description="Bağlantı eskimiş olabilir. Ana sayfadan devam edebilirsin."
      action={<Link className="mh-button mh-button--primary mh-button--md" to={routes.today}>Bugün’e dön</Link>}
    />
  )
}
