import { Component, ErrorInfo, ReactNode } from 'react'
import { ErrorState } from '../../shared/ui'

type State = { error: Error | null }

/** Bir bölüm çökerse yalnızca o bölümü değiştirir; menü ve diğer sayfalar çalışmaya devam eder. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }
  static getDerivedStateFromError(error: Error): State { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Arayüz bölümü hatası', error, info) }
  render() {
    if (this.state.error) {
      return <ErrorState title="Bu bölüm yüklenemedi" message="Diğer bölümleri kullanmaya devam edebilirsin." onRetry={() => this.setState({ error: null })} />
    }
    return this.props.children
  }
}
