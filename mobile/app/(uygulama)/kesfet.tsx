import { useState } from 'react'
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  DiscoveredBook, RecommendedBook, useAddRecommendation, useRecommendations,
} from '../../src/api/discover'
import { SHELVES, booksOnShelf, useBootstrap } from '../../src/api/library'
import { Button, Card, Cover, Field, Heading, Notice, Pill } from '../../src/ui/components'
import { BORDER, fonts, radius, space, theme } from '../../src/ui/theme'

const WISHES = [
  'Yağmurlu bir akşam için kısa ve gizemli',
  'Karakteri zamanla değişen sürükleyici bir roman',
  'Melankolik ama umut veren bir klasik',
  'Zekice diyalogları olan hafif bir şey',
]

function Match({ book, shelfLabel, onAdd, adding }: {
  book: RecommendedBook
  shelfLabel: string | null
  onAdd: () => void
  adding: boolean
}) {
  return (
    <Card>
      <View style={styles.matchHead}>
        <Cover title={book.book_title} />
        <View style={styles.matchText}>
          <Pill label={`%${Math.round(book.match_score * 100)} uyum`} />
          <Text style={styles.matchTitle}>{book.book_title}</Text>
          <Text style={styles.matchMeta}>{book.author} · {book.genre}</Text>
        </View>
      </View>
      <Text style={styles.reason}>{book.reasoning}</Text>
      {shelfLabel ? (
        <Text style={styles.already}>Kitaplığında: {shelfLabel}</Text>
      ) : book.book_id ? (
        <Button label="Okuyacağım" variant="secondary" onPress={onAdd} loading={adding} />
      ) : null}
    </Card>
  )
}

function Discovery({ book }: { book: DiscoveredBook }) {
  return (
    <Card>
      <Text style={styles.matchTitle}>{book.book_title}</Text>
      <Text style={styles.matchMeta}>{book.author} · {book.genre}</Text>
      <Text style={styles.reason}>{book.reasoning}</Text>
      <Text style={styles.already}>Katalogda yok; kitap ekle sekmesinden elle ekleyebilirsin.</Text>
    </Card>
  )
}

export default function KesfetScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const bootstrap = useBootstrap()
  const ask = useRecommendations()
  const add = useAddRecommendation()
  const [wish, setWish] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState<string | null>(null)

  /** Kitabın hangi rafta olduğunu gösterir; aynı kitabı iki kez eklemeyelim. */
  const shelfOf = (bookId: string | null): string | null => {
    if (!bookId) return null
    for (const shelf of SHELVES) {
      if (booksOnShelf(bootstrap.data, shelf).some((item) => item.id === bookId)) {
        return { reading: 'okuyorsun', to_read: 'okuyacaksın', read: 'okudun', abandoned: 'bıraktın' }[shelf]
      }
    }
    return null
  }

  const search = (text: string) => {
    const query = text.trim()
    if (query.length < 3) return setError('Birkaç kelimeyle ne okumak istediğini anlat.')
    setError(null)
    setAdded(null)
    setWish(query)
    ask.mutate(query, {
      onError: (caught) => setError(caught instanceof Error ? caught.message : 'Öneri alınamadı.'),
    })
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
      <Heading title="Keşfet" subtitle="Nasıl bir şey okumak istediğini anlat, Mihenk eşleştirsin." />

      <Card>
        <Field
          label="Ne okumak istiyorsun?"
          value={wish}
          onChangeText={setWish}
          placeholder="Örn. Gece bitmesin dedirten bir polisiye"
          multiline
          onSubmitEditing={() => search(wish)}
        />
        <Button
          label="Öneri getir"
          icon={<Feather name="search" size={17} color={theme.accentInk} />}
          onPress={() => search(wish)}
          loading={ask.isPending}
        />
      </Card>

      <View style={styles.wishes}>
        {WISHES.map((item) => (
          <Pressable key={item} accessibilityRole="button" onPress={() => search(item)} disabled={ask.isPending}>
            <Pill label={item} />
          </Pressable>
        ))}
      </View>

      {error ? <Notice message={error} /> : null}
      {added ? <Notice message={added} tone="info" /> : null}

      {ask.isPending ? (
        <Card>
          <Text style={styles.matchTitle}>Kitaplar seçiliyor…</Text>
          <Text style={styles.reason}>
            Mihenk kitaplığını ve anlattığın ruh hâlini birlikte değerlendiriyor; birkaç saniye sürebilir.
          </Text>
        </Card>
      ) : null}

      {ask.data ? (
        <>
          {ask.data.character_analysis_summary ? (
            <Card>
              <Text style={styles.matchTitle}>Ne anladım</Text>
              <Text style={styles.reason}>{ask.data.character_analysis_summary}</Text>
            </Card>
          ) : null}

          {ask.data.recommended_books.map((book) => (
            <Match
              key={book.book_id ?? book.book_title}
              book={book}
              shelfLabel={shelfOf(book.book_id)}
              adding={add.isPending}
              onAdd={() => book.book_id && add.mutate(
                { bookId: book.book_id, shelf: 'to_read' },
                {
                  onSuccess: () => setAdded(`“${book.book_title}” okuyacağım rafına eklendi.`),
                  onError: (caught) => setError(caught instanceof Error ? caught.message : 'Eklenemedi.'),
                },
              )}
            />
          ))}

          {ask.data.ai_discoveries.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Katalog dışı öneriler</Text>
              {ask.data.ai_discoveries.map((book) => <Discovery key={book.book_title} book={book} />)}
            </>
          ) : null}
        </>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Kitap asistanını aç"
        onPress={() => router.push('/asistan')}
        style={styles.assistant}
      >
        <Image source={require('../../assets/baykus.png')} style={styles.assistantIcon} accessibilityIgnoresInvertColors />
        <Text style={styles.assistantLabel}>Kitap asistanına sor</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.bg },
  page: { paddingHorizontal: space[4], gap: space[3] },
  wishes: { gap: space[2] },
  matchHead: { flexDirection: 'row', gap: space[3], alignItems: 'flex-start' },
  matchText: { flex: 1, gap: space[1], alignItems: 'flex-start' },
  matchTitle: { fontFamily: fonts.display, fontSize: 17, color: theme.ink },
  matchMeta: { fontFamily: fonts.body, fontSize: 14, color: theme.ink2 },
  reason: { fontFamily: fonts.body, fontSize: 14, color: theme.ink2, lineHeight: 20 },
  already: { fontFamily: fonts.bodyMedium, fontSize: 13, color: theme.accentSoftInk },
  sectionTitle: { fontFamily: fonts.display, fontSize: 18, color: theme.ink, marginTop: space[2] },
  assistant: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2],
    backgroundColor: theme.accent, borderRadius: radius.pill, borderWidth: BORDER,
    borderColor: theme.line, paddingVertical: space[3], marginTop: space[2],
  },
  assistantLabel: { fontFamily: fonts.bodyBold, fontSize: 16, color: theme.accentInk },
  // Baykuş mor zeminde kaybolmasın diye beyaz bir dairenin içinde duruyor.
  assistantIcon: {
    width: 32, height: 32, resizeMode: 'contain',
    backgroundColor: theme.surface, borderRadius: 16,
  },
})
