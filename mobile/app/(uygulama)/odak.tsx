import { useEffect, useMemo, useRef, useState } from 'react'
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useKeepAwake } from 'expo-keep-awake'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { booksOnShelf, useBootstrap } from '../../src/api/library'
import { useFinishSession, useReadingStats } from '../../src/api/reading'
import type { LibraryBook } from '../../src/api/types'
import {
  Button, Card, Cover, Empty, Field, Heading, Loading, Notice, Pill, Progress,
} from '../../src/ui/components'
import {
  Timer, createTimer, elapsed, finish, focusedMinutes, formatClock, isRunning,
  pause, remaining, reset, setMode, start, tick,
} from '../../src/features/focus/timer'
import { BORDER, fonts, radius, space, theme } from '../../src/ui/theme'

function BookPicker({ books, selected, onSelect }: {
  books: LibraryBook[]
  selected: LibraryBook | undefined
  onSelect: (book: LibraryBook) => void
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
      style={styles.pickerScroll} contentContainerStyle={styles.picker}>
      {books.map((book) => {
        const active = book.id === selected?.id
        return (
          <Pressable
            key={book.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={book.title}
            onPress={() => onSelect(book)}
            style={[styles.pickerItem, active && styles.pickerItemActive]}
          >
            <Cover title={book.title} url={book.cover_url} isbn={book.isbn} size="s" />
            <Text style={styles.pickerTitle} numberOfLines={2}>{book.title}</Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

function Stats() {
  const stats = useReadingStats()
  if (!stats.data) return null
  const speed = stats.data.average_reading_speed_pages_per_min
  return (
    <Card>
      <Text style={styles.cardTitle}>Okuma alışkanlığın</Text>
      <View style={styles.statRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats.data.total_minutes}</Text>
          <Text style={styles.statLabel}>dakika</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats.data.total_pages_read}</Text>
          <Text style={styles.statLabel}>sayfa</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{speed ? speed.toFixed(1) : '—'}</Text>
          <Text style={styles.statLabel}>sayfa/dk</Text>
        </View>
      </View>
      {stats.data.total_sessions > 0 ? (
        <Text style={styles.cardText}>
          Bu hızla 300 sayfalık bir kitabı yaklaşık {stats.data.estimated_hours_for_300_page_book.toFixed(1)} saatte bitiriyorsun.
        </Text>
      ) : null}
    </Card>
  )
}

export default function OdakScreen() {
  const insets = useSafeAreaInsets()
  const bootstrap = useBootstrap()
  const save = useFinishSession()
  const [timer, setTimer] = useState<Timer>(() => createTimer())
  const [bookId, setBookId] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [finishing, setFinishing] = useState<{ minutes: number } | null>(null)
  const [endPage, setEndPage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const phase = useRef(timer.phase)

  useKeepAwake()

  const books = booksOnShelf(bootstrap.data, 'reading')
  const book = useMemo(
    () => books.find((item) => item.id === bookId) ?? books[0],
    [books, bookId],
  )

  // Saniyede bir yeniden çizilir; süre her zaman zaman damgasından hesaplanır.
  useEffect(() => {
    if (!isRunning(timer)) return
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [timer])

  // Uygulama arka plandan dönünce sayaç bir anda doğru yere gelir.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(Date.now())
    })
    return () => subscription.remove()
  }, [])

  useEffect(() => {
    setTimer((current) => tick(current, now))
  }, [now])

  // Evre değiştiğinde (okuma → mola) kısa bir titreşimle haber verilir.
  useEffect(() => {
    if (phase.current !== timer.phase) {
      phase.current = timer.phase
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
  }, [timer.phase])

  if (bootstrap.isPending) return <Loading label="Kitapların geliyor…" />

  const running = isRunning(timer)
  const onBreak = timer.phase === 'break'
  const display = timer.mode === 'pomodoro' ? remaining(timer, now) : elapsed(timer, now)

  const askPages = () => {
    const { minutes } = finish(timer, now)
    if (minutes < 1) return setError('Kaydetmek için en az bir dakika okumalısın.')
    if (!book) return setError('Önce bir kitap seç.')
    setError(null)
    setEndPage(String(book.current_page ?? 0))
    setFinishing({ minutes })
    setTimer(pause(timer, now))
  }

  const saveSession = () => {
    if (!book || !finishing) return
    const startPage = book.current_page ?? 0
    const end = Number.parseInt(endPage, 10)
    if (Number.isNaN(end) || end < startPage) {
      return setError(`Sayfa ${startPage} ya da daha büyük olmalı.`)
    }
    if (book.total_pages && end > book.total_pages) {
      return setError(`Bu kitap ${book.total_pages} sayfa.`)
    }
    setError(null)
    save.mutate(
      { book, startPage, endPage: end, minutes: finishing.minutes },
      {
        onSuccess: () => {
          setDone(`${finishing.minutes} dakika, ${end - startPage} sayfa kaydedildi.`)
          setFinishing(null)
          setTimer(reset(timer))
        },
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
      keyboardShouldPersistTaps="handled"
    >
      <Heading title="Okuma modu" subtitle="Sayacı başlat, bitince kaldığın sayfayı kaydet." />

      {books.length === 0 ? (
        <Card>
          <Empty
            title="Okuduğun bir kitap yok"
            description="Odak seansı başlatmak için önce bir kitabı “okuyorum” rafına al."
          />
        </Card>
      ) : (
        <>
          <BookPicker books={books} selected={book} onSelect={(item) => setBookId(item.id)} />

          <View style={styles.modes}>
            {(['pomodoro', 'stopwatch'] as const).map((mode) => (
              <Pressable
                key={mode}
                accessibilityRole="radio"
                accessibilityState={{ selected: timer.mode === mode }}
                onPress={() => setTimer(setMode(timer, mode))}
                disabled={running}
              >
                <Pill
                  label={mode === 'pomodoro' ? 'Pomodoro 25/5' : 'Kronometre'}
                  tone={timer.mode === mode ? 'active' : 'plain'}
                />
              </Pressable>
            ))}
          </View>

          <View style={[styles.clockCard, onBreak && styles.clockCardBreak]}>
            <Text style={styles.phase}>{onBreak ? 'Mola' : 'Okuma'}</Text>
            <Text style={styles.clock}>{formatClock(display)}</Text>
            <Text style={styles.clockBook} numberOfLines={1}>{book?.title}</Text>
            {timer.cycles > 0 ? (
              <Text style={styles.cycles}>{timer.cycles} tur tamamlandı</Text>
            ) : null}
          </View>

          {error ? <Notice message={error} /> : null}
          {done ? <Notice message={done} tone="info" /> : null}

          {finishing ? (
            <Card>
              <Text style={styles.cardTitle}>Nerede kaldın?</Text>
              <Text style={styles.cardText}>
                {finishing.minutes} dakika okudun. Kaldığın sayfayı yaz, ilerlemeni kaydedeyim.
              </Text>
              <Field
                label={book?.total_pages ? `Sayfa (toplam ${book.total_pages})` : 'Sayfa'}
                value={endPage}
                onChangeText={setEndPage}
                keyboardType="number-pad"
              />
              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <Button label="Vazgeç" variant="secondary" onPress={() => setFinishing(null)} />
                </View>
                <View style={styles.rowItem}>
                  <Button label="Kaydet" onPress={saveSession} loading={save.isPending} />
                </View>
              </View>
            </Card>
          ) : (
            <View style={styles.actions}>
              <Button
                label={running ? 'Duraklat' : 'Başlat'}
                icon={<Feather name={running ? 'pause' : 'play'} size={18} color={theme.accentInk} />}
                onPress={() => { setDone(null); setNow(Date.now()); setTimer(running ? pause(timer, Date.now()) : start(timer, Date.now())) }}
              />
              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <Button label="Sıfırla" variant="secondary" onPress={() => setTimer(reset(timer))} />
                </View>
                <View style={styles.rowItem}>
                  <Button label="Okumayı bitir" variant="secondary" onPress={askPages} />
                </View>
              </View>
            </View>
          )}

          {book?.total_pages ? (
            <Card>
              <Text style={styles.cardTitle}>{book.title}</Text>
              <Progress page={book.current_page ?? 0} total={book.total_pages} />
            </Card>
          ) : null}
        </>
      )}

      <Stats />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.bg },
  page: { paddingHorizontal: space[4], gap: space[3] },
  pickerScroll: { flexGrow: 0, flexShrink: 0 },
  picker: { gap: space[2], paddingVertical: space[1], paddingRight: space[4] },
  pickerItem: {
    width: 104, padding: space[2], gap: space[1], alignItems: 'center',
    borderRadius: radius.s, borderWidth: BORDER, borderColor: 'transparent',
  },
  pickerItemActive: { borderColor: theme.line, backgroundColor: theme.surface },
  pickerTitle: { fontFamily: fonts.bodyMedium, fontSize: 12, color: theme.ink, textAlign: 'center' },
  modes: { flexDirection: 'row', gap: space[2] },
  clockCard: {
    backgroundColor: theme.ink, borderRadius: radius.l, borderWidth: BORDER, borderColor: theme.line,
    paddingVertical: space[6], paddingHorizontal: space[4], alignItems: 'center', gap: space[1],
  },
  clockCardBreak: { backgroundColor: theme.accent },
  phase: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#FFFFFFB0', letterSpacing: 1.2, textTransform: 'uppercase' },
  clock: { fontFamily: fonts.displayExtra, fontSize: 64, color: '#FFFFFF', letterSpacing: -2 },
  clockBook: { fontFamily: fonts.bodyMedium, fontSize: 15, color: '#FFFFFFD0' },
  cycles: { fontFamily: fonts.body, fontSize: 13, color: '#FFFFFF99' },
  actions: { gap: space[2] },
  row: { flexDirection: 'row', gap: space[2] },
  rowItem: { flex: 1 },
  cardTitle: { fontFamily: fonts.display, fontSize: 17, color: theme.ink },
  cardText: { fontFamily: fonts.body, fontSize: 14, color: theme.ink2, lineHeight: 20 },
  statRow: { flexDirection: 'row', gap: space[2] },
  stat: {
    flex: 1, backgroundColor: theme.surface2, borderRadius: radius.s,
    paddingVertical: space[3], alignItems: 'center',
  },
  statValue: { fontFamily: fonts.displayExtra, fontSize: 22, color: theme.ink },
  statLabel: { fontFamily: fonts.bodyMedium, fontSize: 12, color: theme.ink2 },
})
