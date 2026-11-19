import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { SessionProvider, useSession } from '../src/session/SessionProvider'
import { Loading } from '../src/ui/components'
import { useBrandFonts } from '../src/ui/fonts'
import { theme } from '../src/ui/theme'

const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

/** Oturum durumuna göre kişiyi giriş ekranına ya da uygulamaya götürür. */
function Gate({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const segments = useSegments()
  const router = useRouter()
  // Giriş ekranı dışındaki her sayfa oturum ister; kitap ayrıntısı sekmelerin
  // üstünde açıldığı için grup adına değil, giriş ekranında olup olmadığımıza bakılır.
  const onAuthScreen = segments[0] === 'giris' || segments[0] === undefined

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'signed-out' && !onAuthScreen) router.replace('/giris')
    if (status === 'signed-in' && onAuthScreen) router.replace('/(uygulama)/kitaplik')
  }, [status, onAuthScreen, router])

  if (status === 'loading') return <Loading label="Mihenk açılıyor…" />
  return <>{children}</>
}

export default function RootLayout() {
  const fontsReady = useBrandFonts()
  if (!fontsReady) return null

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
