import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { SessionProvider, useSession } from '../src/session/SessionProvider'
import { Loading } from '../src/ui/components'
import { theme } from '../src/ui/theme'

const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

/** Oturum durumuna göre kişiyi giriş ekranına ya da uygulamaya götürür. */
function Gate({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const segments = useSegments()
  const router = useRouter()
  const inApp = segments[0] === '(uygulama)'

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'signed-out' && inApp) router.replace('/giris')
    if (status === 'signed-in' && !inApp) router.replace('/(uygulama)/kitaplik')
  }, [status, inApp, router])

  if (status === 'loading') return <Loading label="Mihenk açılıyor…" />
  return <>{children}</>
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={client}>
        <SessionProvider>
          <StatusBar style="dark" />
          <Gate>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }} />
          </Gate>
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
