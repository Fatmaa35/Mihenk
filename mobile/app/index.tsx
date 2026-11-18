import { Redirect } from 'expo-router'
import { useSession } from '../src/session/SessionProvider'

export default function Index() {
  const { status } = useSession()
  if (status === 'signed-in') return <Redirect href="/(uygulama)/kitaplik" />
  return <Redirect href="/giris" />
}
