import { useState } from 'react'
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { api, API_URL } from '../../src/api/client'
import { SHELVES, booksOnShelf, useBootstrap } from '../../src/api/library'
import { useSession } from '../../src/session/SessionProvider'
import { Button, Card, Loading, Notice } from '../../src/ui/components'
import { theme } from '../../src/ui/theme'

/**
 * Profil ve hesap. Play Store, uygulama içinden hesap silme yolu sunulmasını
 * şart koşuyor; silme iki aşamalı onayla yapılır ve sunucudaki
 * `DELETE /me/account` ucunu çağırır.
 */
export default function ProfilScreen() {
  const insets = useSafeAreaInsets()
  const bootstrap = useBootstrap()
  const { signOut } = useSession()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = SHELVES.reduce((sum, shelf) => sum + booksOnShelf(bootstrap.data, shelf).length, 0)
  const reading = booksOnShelf(bootstrap.data, 'reading').length
  const read = booksOnShelf(bootstrap.data, 'read').length

  const deleteAccount = async () => {
    setError(null)
    setBusy(true)
    try {
      await api<void>('/me/account', { method: 'DELETE' })
      await signOut()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Hesap silinemedi.')
    } finally {
      setBusy(false)
      setConfirming(false)
    }
  }

  if (bootstrap.isPending) return <Loading />

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
    >
      <Text style={styles.heading}>{bootstrap.data?.user.display_name ?? 'Profil'}</Text>

      <Card>
        <Text style={styles.cardTitle}>Kitaplığın</Text>
        <View style={styles.stats}>
          <View style={styles.stat}><Text style={styles.statValue}>{total}</Text><Text style={styles.statLabel}>kitap</Text></View>
          <View style={styles.stat}><Text style={styles.statValue}>{reading}</Text><Text style={styles.statLabel}>okuyorsun</Text></View>
          <View style={styles.stat}><Text style={styles.statValue}>{read}</Text><Text style={styles.statLabel}>bitirdin</Text></View>
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Gizlilik</Text>
        <Text style={styles.cardText}>
          Verilerinin nasıl kullanıldığını gizlilik metninde bulabilirsin.
        </Text>
        <Button
          label="Gizlilik metnini aç"
          variant="ghost"
          onPress={() => void Linking.openURL(`${API_URL}/privacy`)}
        />
      </Card>

      <Button label="Çıkış yap" variant="ghost" onPress={() => void signOut()} />

      <Card style={styles.dangerCard}>
        <Text style={styles.cardTitle}>Hesabı sil</Text>
        <Text style={styles.cardText}>
          Hesabın, kitaplığın, notların ve alıntıların kalıcı olarak silinir. Bu işlem geri alınamaz.
        </Text>
        {error ? <Notice message={error} /> : null}
        {confirming ? (
          <View style={styles.confirmRow}>
            <Button label="Vazgeç" variant="ghost" onPress={() => setConfirming(false)} />
            <Button label="Kalıcı olarak sil" variant="danger" loading={busy} onPress={() => void deleteAccount()} />
          </View>
        ) : (
          <Button label="Hesabımı sil" variant="danger" onPress={() => setConfirming(true)} />
        )}
      </Card>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.bg },
  page: { paddingHorizontal: 16, gap: 14 },
  heading: { fontSize: 26, fontWeight: '800', color: theme.ink },
  cardTitle: { fontSize: 17, fontWeight: '700', color: theme.ink },
  cardText: { fontSize: 14, color: theme.ink2, lineHeight: 20 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: theme.surfaceMuted, borderRadius: theme.radius, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: theme.ink },
  statLabel: { fontSize: 13, color: theme.ink2 },
  dangerCard: { borderColor: theme.danger },
  confirmRow: { flexDirection: 'row', gap: 10 },
})
