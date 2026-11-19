import { useState } from 'react'
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { api, API_URL } from '../../src/api/client'
import { SHELVES, booksOnShelf, useBootstrap } from '../../src/api/library'
import { useSession } from '../../src/session/SessionProvider'
import { Button, Card, Heading, Loading, Notice } from '../../src/ui/components'
import { BORDER, fonts, radius, space, theme } from '../../src/ui/theme'

function Stat({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <View style={[styles.stat, { backgroundColor: tone }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

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
      contentContainerStyle={[
        styles.page,
        { paddingTop: insets.top + space[3], paddingBottom: insets.bottom + space[6] },
      ]}
    >
      <Heading title={bootstrap.data?.user.display_name ?? 'Profil'} subtitle="Okuma durumun ve hesap ayarların." />

      <View style={styles.stats}>
        <Stat value={total} label="kitap" tone="#D9F2E3" />
        <Stat value={reading} label="okuyorsun" tone="#E7E5FF" />
        <Stat value={read} label="bitirdin" tone="#FFE9C7" />
      </View>

      <Card>
        <Text style={styles.cardTitle}>Gizlilik</Text>
        <Text style={styles.cardText}>Verilerinin nasıl kullanıldığını gizlilik metninde bulabilirsin.</Text>
        <Button
          label="Gizlilik metnini aç"
          variant="secondary"
          icon={<Feather name="external-link" size={17} color={theme.ink} />}
          onPress={() => void Linking.openURL(`${API_URL}/privacy`)}
        />
      </Card>

      <Button
        label="Çıkış yap"
        variant="quiet"
        icon={<Feather name="log-out" size={17} color={theme.ink} />}
        onPress={() => void signOut()}
      />

      <Card tone="danger">
        <Text style={styles.cardTitle}>Hesabı sil</Text>
        <Text style={styles.cardText}>
          Hesabın, kitaplığın, notların ve alıntıların kalıcı olarak silinir. Bu işlem geri alınamaz.
        </Text>
        {error ? <Notice message={error} /> : null}
        {confirming ? (
          <View style={styles.confirmRow}>
            <View style={styles.confirmItem}>
              <Button label="Vazgeç" variant="secondary" onPress={() => setConfirming(false)} />
            </View>
            <View style={styles.confirmItem}>
              <Button label="Kalıcı olarak sil" variant="danger" loading={busy} onPress={() => void deleteAccount()} />
            </View>
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
  page: { paddingHorizontal: space[4], gap: space[3] },
  stats: { flexDirection: 'row', gap: space[2] },
  stat: {
    flex: 1, borderRadius: radius.m, borderWidth: BORDER, borderColor: theme.line,
    paddingVertical: space[3], alignItems: 'center', gap: 2,
  },
  statValue: { fontFamily: fonts.displayExtra, fontSize: 24, color: theme.ink },
  statLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: theme.ink2 },
  cardTitle: { fontFamily: fonts.display, fontSize: 17, color: theme.ink },
  cardText: { fontFamily: fonts.body, fontSize: 14, color: theme.ink2, lineHeight: 20 },
  confirmRow: { flexDirection: 'row', gap: space[2] },
  confirmItem: { flex: 1 },
})
