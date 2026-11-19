import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  SHELF_LABEL, SHELVES, booksOnShelf, useBootstrap, useRemoveEntry, useSaveEntry,
} from '../../../src/api/library'
import type { LibraryBook, Shelf } from '../../../src/api/types'
import {
  Button, Card, Cover, Field, Loading, Notice, Pill, Progress,
} from '../../../src/ui/components'
import { fonts, space, theme } from '../../../src/ui/theme'

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
      <View style={[styles.page, { paddingTop: insets.top + space[4] }]}>
        <Notice message="Bu kitap kitaplığında görünmüyor." />
        <Button label="Kitaplığa dön" variant="secondary" onPress={() => router.replace('/(uygulama)/kitaplik')} />
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
      contentContainerStyle={[
        styles.page,
        { paddingTop: insets.top + space[3], paddingBottom: insets.bottom + space[6] },
      ]}
    >
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
        <Feather name="chevron-left" size={20} color={theme.accentSoftInk} />
        <Text style={styles.backLabel}>Kitaplık</Text>
      </Pressable>

      <View style={styles.header}>
        <Cover title={book.title} size="l" />
        <View style={styles.headerText}>
          <Text style={styles.title}>{book.title}</Text>
          <Text style={styles.author}>{book.author}{book.genre ? ` · ${book.genre}` : ''}</Text>
          {book.is_custom ? (
            <View style={styles.badgeRow}><Pill label="Kendi eklediğin kitap" /></View>
          ) : null}
        </View>
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
            >
              <Pill label={SHELF_LABEL[shelf]} tone={shelf === book.shelf ? 'active' : 'plain'} />
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Nerede kaldın?</Text>
        {total ? <Progress page={book.current_page ?? 0} total={total} /> : null}
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
  page: { paddingHorizontal: space[4], gap: space[3] },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: space[1] },
  backLabel: { fontFamily: fonts.bodyBold, fontSize: 15, color: theme.accentSoftInk },
  header: { flexDirection: 'row', gap: space[4], alignItems: 'flex-start', marginBottom: space[1] },
  headerText: { flex: 1, gap: space[1] },
  title: { fontFamily: fonts.displayExtra, fontSize: 24, color: theme.ink, letterSpacing: -0.4 },
  author: { fontFamily: fonts.body, fontSize: 15, color: theme.ink2 },
  badgeRow: { flexDirection: 'row', marginTop: space[1] },
  cardTitle: { fontFamily: fonts.display, fontSize: 17, color: theme.ink },
  shelfRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
})
