import { useRef, useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAddByIsbn, useAddCustomBook } from '../../src/api/isbn'
import { SHELF_LABEL } from '../../src/api/library'
import type { Shelf } from '../../src/api/types'
import { Button, Card, Field, Notice } from '../../src/ui/components'
import { theme } from '../../src/ui/theme'

const ADDABLE: Shelf[] = ['reading', 'to_read']

function ShelfPicker({ value, onChange }: { value: Shelf; onChange: (shelf: Shelf) => void }) {
  return (
    <View style={styles.picker}>
      {ADDABLE.map((shelf) => (
        <Pressable
          key={shelf}
          accessibilityRole="radio"
          accessibilityState={{ selected: shelf === value }}
          onPress={() => onChange(shelf)}
          style={[styles.pickerItem, shelf === value && styles.pickerItemActive]}
        >
          <Text style={[styles.pickerLabel, shelf === value && styles.pickerLabelActive]}>
            {SHELF_LABEL[shelf]}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

export default function EkleScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
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
        <View style={[styles.scannerFoot, { paddingBottom: insets.bottom + 16 }]}>
          <Text style={styles.scannerHint}>Kitabın arkasındaki barkodu çerçeveye getir.</Text>
          <Button label="Vazgeç" variant="ghost" onPress={() => setScanning(false)} />
        </View>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
    >
      <Text style={styles.heading}>Kitap ekle</Text>
      <ShelfPicker value={shelf} onChange={setShelf} />
      {message ? <Notice message={message.text} tone={message.tone} /> : null}

      <Card>
        <Text style={styles.cardTitle}>Barkoddan ekle</Text>
        <Text style={styles.cardText}>
          Kitabın arkasındaki ISBN barkodunu okut; adı, yazarı ve sayfa sayısı kendiliğinden gelir.
        </Text>
        <Button
          label={byIsbn.isPending ? 'Ekleniyor…' : 'Barkod okut'}
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
        <Button label="Kitaplığıma ekle" variant="ghost" onPress={addByHand} loading={custom.isPending} />
      </Card>

      <Button label="Kitaplığa dön" variant="ghost" onPress={() => router.replace('/(uygulama)/kitaplik')} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.bg },
  page: { paddingHorizontal: 16, gap: 14 },
  heading: { fontSize: 26, fontWeight: '800', color: theme.ink },
  picker: { flexDirection: 'row', gap: 8 },
  pickerItem: {
    flex: 1, paddingVertical: 10, borderRadius: 999, backgroundColor: theme.surfaceMuted, alignItems: 'center',
  },
  pickerItemActive: { backgroundColor: theme.accent },
  pickerLabel: { color: theme.ink2, fontWeight: '600' },
  pickerLabelActive: { color: '#fff' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: theme.ink },
  cardText: { fontSize: 14, color: theme.ink2, lineHeight: 20 },
  scanner: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  scannerFoot: { padding: 16, gap: 12, backgroundColor: theme.bg },
  scannerHint: { textAlign: 'center', color: theme.ink2 },
})
