import { useState } from 'react'
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Link } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SHELF_LABEL, SHELVES, booksOnShelf, useBootstrap } from '../../src/api/library'
import type { LibraryBook, Shelf } from '../../src/api/types'
import { Empty, Loading, Notice } from '../../src/ui/components'
import { theme } from '../../src/ui/theme'

function ShelfTabs({ value, onChange, counts }: {
  value: Shelf
  onChange: (shelf: Shelf) => void
  counts: Record<Shelf, number>
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
      {SHELVES.map((shelf) => {
        const active = shelf === value
        return (
          <Pressable
            key={shelf}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(shelf)}
            style={[styles.tab, active && styles.tabActive]}
          >
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
              {SHELF_LABEL[shelf]} {counts[shelf] ? `· ${counts[shelf]}` : ''}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

function BookRow({ book }: { book: LibraryBook }) {
  const progress = book.progress_percent ?? 0
  return (
    <Link href={{ pathname: '/(uygulama)/kitap/[id]', params: { id: book.id } }} asChild>
      <Pressable accessibilityRole="link" style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle} numberOfLines={2}>{book.title}</Text>
          <Text style={styles.rowAuthor} numberOfLines={1}>{book.author}</Text>
          {book.shelf === 'reading' && book.total_pages ? (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, progress)}%` }]} />
            </View>
          ) : null}
          {book.shelf === 'reading' && book.total_pages ? (
            <Text style={styles.rowMeta}>
              {book.current_page ?? 0} / {book.total_pages} sayfa
            </Text>
          ) : null}
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </Link>
  )
}

export default function KitaplikScreen() {
  const insets = useSafeAreaInsets()
  const bootstrap = useBootstrap()
  const [shelf, setShelf] = useState<Shelf>('reading')

  const counts = SHELVES.reduce((all, item) => {
    all[item] = booksOnShelf(bootstrap.data, item).length
    return all
  }, {} as Record<Shelf, number>)
  const books = booksOnShelf(bootstrap.data, shelf)

  return (
    <View style={[styles.page, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.heading}>Kitaplığım</Text>
      <ShelfTabs value={shelf} onChange={setShelf} counts={counts} />
      {bootstrap.isPending ? <Loading label="Kitaplığın geliyor…" /> : null}
      {bootstrap.isError ? <Notice message={(bootstrap.error as Error).message} /> : null}
      {bootstrap.isSuccess ? (
        <FlatList
          data={books}
          keyExtractor={(book) => book.id}
          renderItem={({ item }) => <BookRow book={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={bootstrap.isFetching} onRefresh={() => void bootstrap.refetch()} />
          }
          ListEmptyComponent={
            <Empty
              title={`${SHELF_LABEL[shelf]} rafı boş`}
              description="Kitap ekle sekmesinden barkod okutarak ya da adıyla arayarak kitap ekleyebilirsin."
            />
          }
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: 16, gap: 10 },
  heading: { fontSize: 26, fontWeight: '800', color: theme.ink },
  tabs: { gap: 8, paddingVertical: 4 },
  tab: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
    backgroundColor: theme.surfaceMuted,
  },
  tabActive: { backgroundColor: theme.accent },
  tabLabel: { color: theme.ink2, fontWeight: '600', fontSize: 14 },
  tabLabelActive: { color: '#fff' },
  list: { paddingVertical: 8, gap: 10 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.surface,
    borderRadius: theme.radius, borderWidth: 1, borderColor: theme.border, padding: 14,
  },
  rowText: { flex: 1, gap: 4 },
  rowTitle: { fontSize: 16, fontWeight: '700', color: theme.ink },
  rowAuthor: { fontSize: 14, color: theme.ink2 },
  rowMeta: { fontSize: 13, color: theme.ink2 },
  progressTrack: {
    height: 6, borderRadius: 3, backgroundColor: theme.surfaceMuted, overflow: 'hidden', marginTop: 2,
  },
  progressFill: { height: 6, backgroundColor: theme.accent },
  chevron: { fontSize: 28, color: theme.ink2 },
})
