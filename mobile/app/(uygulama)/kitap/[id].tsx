import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  SHELF_LABEL, SHELVES, booksOnShelf, useBootstrap, useRemoveEntry, useSaveEntry,
} from '../../../src/api/library'
import type { LibraryBook, Shelf } from '../../../src/api/types'
import { Button, Card, Field, Loading, Notice } from '../../../src/ui/components'
import { theme } from '../../../src/ui/theme'

export default function KitapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const bootstrap = useBootstrap()
  const save = useSaveEntry()
  const remove = useRemoveEntry()
  const [page, setPage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const book: LibraryBook | undefined = useMemo(() => {
    for (const shelf of SHELVES) {
      const found = booksOnShelf(bootstrap.data, shelf).find((item) => item.id === id)
      if (found) return found
    }
    return undefined
  }, [bootstrap.data, id])

  if (bootstrap.isPending) return <Loading label="Kitap getiriliyor…" />
  if (!book) {
    return (
      <View style={[styles.page, { paddingTop: insets.top + 16 }]}>
        <Notice message="Bu kitap kitaplığında görünmüyor." />
        <Button label="Kitaplığa dön" variant="ghost" onPress={() => router.replace('/(uygulama)/kitaplik')} />
      </View>
    )
  }

  const currentPage = page ?? String(book.current_page ?? 0)
  const total = book.total_pages ?? null

  const changeShelf = (shelf: Shelf) => {
    setError(null)
    save.mutate(
      { book_id: book.id, shelf, current_page: book.current_page ?? 0, total_pages: total },
      { onError: (caught) => setError(caught instanceof Error ? caught.message : 'Kaydedilemedi.') },
    )
  }

  const saveProgress = () => {
    setError(null)
    const value = Number.parseInt(currentPage, 10)
    if (Number.isNaN(value) || value < 0) return setError('Sayfa numarası bir sayı olmalı.')
    if (total && value > total) return setError(`Bu kitap ${total} sayfa; daha büyük bir sayfa olamaz.`)
    save.mutate(
      { book_id: book.id, shelf: book.shelf, current_page: value, total_pages: total },
      {
        onSuccess: () => setPage(null),
        onError: (caught) => setError(caught instanceof Error ? caught.message : 'Kaydedilemedi.'),
      },
    )
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
    >
      <Pressable accessibilityRole="button" onPress={() => router.back()}>
        <Text style={styles.back}>‹ Kitaplık</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.title}>{book.title}</Text>
        <Text style={styles.author}>{book.author}</Text>
        {book.is_custom ? <Text style={styles.badge}>Kendi eklediğin kitap</Text> : null}
      </View>

      {error ? <Notice message={error} /> : null}

      <Card>
        <Text style={styles.cardTitle}>Raf</Text>
        <View style={styles.shelfRow}>
          {SHELVES.map((shelf) => (
            <Pressable
              key={shelf}
              accessibilityRole="radio"
              accessibilityState={{ selected: shelf === book.shelf }}
              onPress={() => changeShelf(shelf)}
              style={[styles.shelf, shelf === book.shelf && styles.shelfActive]}
            >
              <Text style={[styles.shelfLabel, shelf === book.shelf && styles.shelfLabelActive]}>
                {SHELF_LABEL[shelf]}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Nerede kaldın?</Text>
        <Field
          label={total ? `Sayfa (toplam ${total})` : 'Sayfa'}
          value={currentPage}
          onChangeText={setPage}
          keyboardType="number-pad"
        />
        <Button label="İlerlemeyi kaydet" onPress={saveProgress} loading={save.isPending} />
      </Card>

      <Button
        label="Kitaplığımdan çıkar"
        variant="danger"
        loading={remove.isPending}
        onPress={() => remove.mutate(book.id, {
          onSuccess: () => router.replace('/(uygulama)/kitaplik'),
          onError: (caught) => setError(caught instanceof Error ? caught.message : 'Çıkarılamadı.'),
        })}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.bg },
  page: { paddingHorizontal: 16, gap: 14 },
  back: { color: theme.accent, fontWeight: '600', fontSize: 16, paddingVertical: 4 },
  header: { gap: 4 },
  title: { fontSize: 24, fontWeight: '800', color: theme.ink },
  author: { fontSize: 16, color: theme.ink2 },
  badge: { marginTop: 4, color: theme.accent, fontSize: 13, fontWeight: '600' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: theme.ink },
  shelfRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shelf: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: theme.surfaceMuted },
  shelfActive: { backgroundColor: theme.accent },
  shelfLabel: { color: theme.ink2, fontWeight: '600', fontSize: 14 },
  shelfLabelActive: { color: '#fff' },
})
