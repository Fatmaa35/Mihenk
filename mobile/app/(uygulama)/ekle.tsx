import { useRef, useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAddByIsbn, useAddCustomBook } from '../../src/api/isbn'
import { SHELF_LABEL } from '../../src/api/library'
import type { Shelf } from '../../src/api/types'
import { Button, Card, Field, Heading, Notice, Pill } from '../../src/ui/components'
import { fonts, radius, space, theme } from '../../src/ui/theme'

const ADDABLE: Shelf[] = ['reading', 'to_read']

export default function EkleScreen() {
  const insets = useSafeAreaInsets()
  const [permission, requestPermission] = useCameraPermissions()
  const [scanning, setScanning] = useState(false)
  const [shelf, setShelf] = useState<Shelf>('reading')
  const [message, setMessage] = useState<{ text: string; tone: 'error' | 'info' } | null>(null)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const handled = useRef(false)

  const byIsbn = useAddByIsbn()
  const custom = useAddCustomBook()

  const scanned = (isbn: string) => {
    if (handled.current) return
    handled.current = true
    setScanning(false)
    byIsbn.mutate({ isbn, shelf }, {
      onSuccess: (book) => {
        setMessage({ text: `“${book.title}” ${SHELF_LABEL[shelf].toLowerCase()} rafına eklendi.`, tone: 'info' })
        handled.current = false
      },
      onError: (error) => {
        setMessage({ text: error instanceof Error ? error.message : 'Kitap eklenemedi.', tone: 'error' })
        handled.current = false
      },
    })
  }

  const openScanner = async () => {
    setMessage(null)
    if (!permission?.granted) {
      const asked = await requestPermission()
      if (!asked.granted) {
        return setMessage({
          text: 'Barkod okutmak için kamera izni gerekiyor. İzni telefon ayarlarından verebilirsin.',
          tone: 'error',
        })
      }
    }
    handled.current = false
    setScanning(true)
  }

  const addByHand = () => {
    setMessage(null)
    if (title.trim().length < 2) return setMessage({ text: 'Kitabın adını yaz.', tone: 'error' })
    if (author.trim().length < 2) return setMessage({ text: 'Yazarın adını yaz.', tone: 'error' })
    custom.mutate({ title, author, shelf }, {
      onSuccess: () => {
        setMessage({ text: `“${title.trim()}” kitaplığına eklendi.`, tone: 'info' })
        setTitle('')
        setAuthor('')
      },
      onError: (error) => setMessage({
        text: error instanceof Error ? error.message : 'Kitap eklenemedi.', tone: 'error',
      }),
    })
  }

  if (scanning) {
    return (
      <View style={styles.scanner}>
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8'] }}
          onBarcodeScanned={({ data }) => scanned(data)}
        />
        <View style={[styles.scannerFoot, { paddingBottom: insets.bottom + space[4] }]}>
          <Text style={styles.scannerHint}>Kitabın arkasındaki barkodu çerçeveye getir.</Text>
          <Button label="Vazgeç" variant="secondary" onPress={() => setScanning(false)} />
        </View>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.page,
        { paddingTop: insets.top + space[3], paddingBottom: insets.bottom + space[6] },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Heading title="Kitap ekle" subtitle="Barkodu okut, gerisini Mihenk doldursun." />

      <View style={styles.shelfRow}>
        {ADDABLE.map((item) => (
          <Pressable
            key={item}
            accessibilityRole="radio"
            accessibilityState={{ selected: item === shelf }}
            onPress={() => setShelf(item)}
          >
            <Pill label={SHELF_LABEL[item]} tone={item === shelf ? 'active' : 'plain'} />
          </Pressable>
        ))}
      </View>

      {message ? <Notice message={message.text} tone={message.tone} /> : null}

      <Card>
        <Text style={styles.cardTitle}>Barkoddan ekle</Text>
        <Text style={styles.cardText}>
          Kitabın arkasındaki ISBN barkodunu okut; adı, yazarı ve sayfa sayısı kendiliğinden gelir.
        </Text>
        <Button
          label={byIsbn.isPending ? 'Ekleniyor…' : 'Barkod okut'}
          icon={<Feather name="camera" size={18} color={theme.accentInk} />}
          onPress={() => void openScanner()}
          loading={byIsbn.isPending}
          disabled={Platform.OS === 'web'}
        />
        {Platform.OS === 'web' ? <Text style={styles.cardText}>Barkod okuma yalnızca telefonda çalışır.</Text> : null}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Elle ekle</Text>
        <Text style={styles.cardText}>Barkodu olmayan ya da katalogda bulunmayan kitaplar için.</Text>
        <Field label="Kitabın adı" value={title} onChangeText={setTitle} />
        <Field label="Yazar" value={author} onChangeText={setAuthor} />
        <Button label="Kitaplığıma ekle" variant="secondary" onPress={addByHand} loading={custom.isPending} />
      </Card>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.bg },
  page: { paddingHorizontal: space[4], gap: space[3] },
  shelfRow: { flexDirection: 'row', gap: space[2] },
  cardTitle: { fontFamily: fonts.display, fontSize: 17, color: theme.ink },
  cardText: { fontFamily: fonts.body, fontSize: 14, color: theme.ink2, lineHeight: 20 },
  scanner: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  scannerFoot: {
    padding: space[4], gap: space[3], backgroundColor: theme.bg,
    borderTopWidth: 2, borderTopColor: theme.line, borderTopLeftRadius: radius.l, borderTopRightRadius: radius.l,
  },
  scannerHint: { textAlign: 'center', fontFamily: fonts.bodyMedium, color: theme.ink2 },
})
