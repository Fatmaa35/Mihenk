import { useState } from 'react'
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Link } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SHELF_LABEL, SHELVES, booksOnShelf, useBootstrap } from '../../src/api/library'
import type { LibraryBook, Shelf } from '../../src/api/types'
import { Cover, Empty, Hard, Heading, Loading, Notice, Pill, Progress } from '../../src/ui/components'
import { BORDER, SHADOW_OFFSET, fonts, radius, space, theme } from '../../src/ui/theme'

function ShelfTabs({ value, onChange, counts }: {
  value: Shelf
  onChange: (shelf: Shelf) => void
  counts: Record<Shelf, number>
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
      {SHELVES.map((shelf) => (
        <Pressable
          key={shelf}
          accessibilityRole="tab"
          accessibilityState={{ selected: shelf === value }}
          onPress={() => onChange(shelf)}
        >
          <Pill
            label={SHELF_LABEL[shelf]}
            tone={shelf === value ? 'active' : 'plain'}
            count={counts[shelf]}
          />
        </Pressable>
      ))}
    </ScrollView>
  )
}

function BookRow({ book }: { book: LibraryBook }) {
  return (
    <Link href={{ pathname: '/(uygulama)/kitap/[id]', params: { id: book.id } }} asChild>
      <Pressable accessibilityRole="link" style={({ pressed }) => (pressed ? styles.pressed : undefined)}>
        <Hard style={styles.rowShadow}>
          <View style={styles.row}>
            <Cover title={book.title} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle} numberOfLines={2}>{book.title}</Text>
              <Text style={styles.rowAuthor} numberOfLines={1}>
                {book.author}{book.genre ? ` · ${book.genre}` : ''}
              </Text>
              {book.shelf === 'reading' && book.total_pages ? (
                <Progress page={book.current_page ?? 0} total={book.total_pages} />
              ) : null}
            </View>
            <Feather name="chevron-right" size={20} color={theme.ink2} />
          </View>
        </Hard>
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
    <View style={[styles.page, { paddingTop: insets.top + space[3] }]}>
      <Heading title="Kitaplığım" subtitle="Başladığın, sürdürdüğün ve bitirdiğin kitaplar tek yerde." />
      <ShelfTabs value={shelf} onChange={setShelf} counts={counts} />
      {bootstrap.isPending ? <Loading label="Kitaplığın geliyor…" /> : null}
      {bootstrap.isError ? <Notice message={(bootstrap.error as Error).message} /> : null}
      {bootstrap.isSuccess ? (
        <FlatList
          data={books}
          keyExtractor={(book) => book.id}
          renderItem={({ item }) => <BookRow book={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={bootstrap.isFetching} onRefresh={() => void bootstrap.refetch()}
              tintColor={theme.accent} />
          }
          ListEmptyComponent={
            <Empty
              title={`${SHELF_LABEL[shelf]} rafı boş`}
              description="Kitap ekle sekmesinden barkod okutarak ya da adıyla yazarak kitap ekleyebilirsin."
            />
          }
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: space[4], gap: space[3] },
  tabs: { gap: space[2], paddingVertical: space[1], paddingRight: space[4] },
  list: { paddingTop: space[1], paddingBottom: space[6], gap: space[3] },
  rowShadow: { marginRight: SHADOW_OFFSET, marginBottom: SHADOW_OFFSET },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: space[3], backgroundColor: theme.surface,
    borderRadius: radius.m, borderWidth: BORDER, borderColor: theme.line, padding: space[3],
  },
  rowText: { flex: 1, gap: space[1] },
  rowTitle: { fontFamily: fonts.display, fontSize: 17, color: theme.ink },
  rowAuthor: { fontFamily: fonts.body, fontSize: 14, color: theme.ink2 },
  pressed: { opacity: 0.85 },
})
