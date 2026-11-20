import { ComponentRef, useRef, useState } from 'react'
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChatMessage, useAssistant } from '../src/api/discover'
import { Notice, Pill } from '../src/ui/components'
import { BORDER, fonts, radius, space, theme } from '../src/ui/theme'

const OPENERS = [
  'Kitaplığımda ne var?',
  'Bu ay kaç sayfa okudum?',
  'Yarım bıraktıklarımdan hangisine döneyim?',
]

function Bubble({ message }: { message: ChatMessage }) {
  const mine = message.role === 'user'
  return (
    <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
      <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{message.content}</Text>
    </View>
  )
}

/** Kitap asistanı: kitaplık soruları, okuma istatistikleri ve öneriler. */
export default function AsistanScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const assistant = useAssistant()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>(OPENERS)
  const [error, setError] = useState<string | null>(null)
  const sessionId = useRef<string | null>(null)
  const list = useRef<ComponentRef<typeof ScrollView>>(null)

  const send = (text: string) => {
    const message = text.trim()
    if (message.length < 2 || assistant.isPending) return
    setError(null)
    setDraft('')
    const history = [...messages, { role: 'user' as const, content: message }]
    setMessages(history)
    setSuggestions([])
    assistant.mutate(
      { message, history: messages, sessionId: sessionId.current },
      {
        onSuccess: (reply) => {
          sessionId.current = reply.session_id ?? sessionId.current
          setMessages([...history, { role: 'assistant', content: reply.answer }])
          setSuggestions(reply.suggestions ?? [])
        },
        onError: (caught) => setError(caught instanceof Error ? caught.message : 'Asistana ulaşılamadı.'),
      },
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <View style={[styles.header, { paddingTop: insets.top + space[2] }]}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
          <Feather name="chevron-left" size={20} color={theme.accentSoftInk} />
          <Text style={styles.backLabel}>Geri</Text>
        </Pressable>
        <Text style={styles.title}>Kitap asistanı</Text>
      </View>

      <ScrollView
        ref={list}
        style={styles.flex}
        contentContainerStyle={styles.thread}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 ? (
          <View style={styles.intro}>
            <Text style={styles.introTitle}>Ne sormak istersin?</Text>
            <Text style={styles.introText}>
              Kitaplığını, okuma istatistiklerini ve önerileri sorabilirsin. Kendi eklediğin
              kitapları da bilir.
            </Text>
          </View>
        ) : null}

        {messages.map((message, index) => <Bubble key={index} message={message} />)}

        {assistant.isPending ? (
          <View style={[styles.bubble, styles.theirs]}>
            <Text style={styles.bubbleText}>Düşünüyor…</Text>
          </View>
        ) : null}

        {error ? <Notice message={error} /> : null}

        {suggestions.length > 0 && !assistant.isPending ? (
          <View style={styles.suggestions}>
            {suggestions.slice(0, 4).map((item) => (
              <Pressable key={item} accessibilityRole="button" onPress={() => send(item)}>
                <Pill label={item} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.composer, { paddingBottom: insets.bottom + space[2] }]}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Bir şey sor…"
          placeholderTextColor={theme.ink3}
          accessibilityLabel="Asistana mesaj"
          onSubmitEditing={() => send(draft)}
          returnKeyType="send"
          maxLength={1000}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Gönder"
          onPress={() => send(draft)}
          disabled={assistant.isPending || draft.trim().length < 2}
          style={[styles.sendButton, (assistant.isPending || draft.trim().length < 2) && styles.sendDisabled]}
        >
          <Feather name="send" size={18} color={theme.accentInk} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.bg },
  header: {
    paddingHorizontal: space[4], paddingBottom: space[2], gap: space[1],
    backgroundColor: theme.surface, borderBottomWidth: BORDER, borderBottomColor: theme.line,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backLabel: { fontFamily: fonts.bodyBold, fontSize: 15, color: theme.accentSoftInk },
  title: { fontFamily: fonts.displayExtra, fontSize: 24, color: theme.ink },
  thread: { padding: space[4], gap: space[3] },
  intro: { gap: space[2], paddingVertical: space[4] },
  introTitle: { fontFamily: fonts.display, fontSize: 20, color: theme.ink },
  introText: { fontFamily: fonts.body, fontSize: 15, color: theme.ink2, lineHeight: 21 },
  bubble: {
    maxWidth: '88%', borderRadius: radius.m, borderWidth: BORDER, borderColor: theme.line,
    paddingHorizontal: space[3], paddingVertical: space[3],
  },
  mine: { alignSelf: 'flex-end', backgroundColor: theme.accent },
  theirs: { alignSelf: 'flex-start', backgroundColor: theme.surface },
  bubbleText: { fontFamily: fonts.body, fontSize: 15, color: theme.ink, lineHeight: 21 },
  bubbleTextMine: { color: theme.accentInk },
  suggestions: { gap: space[2], alignItems: 'flex-start' },
  composer: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    paddingHorizontal: space[4], paddingTop: space[2],
    backgroundColor: theme.surface, borderTopWidth: BORDER, borderTopColor: theme.line,
  },
  input: {
    flex: 1, minHeight: 48, borderRadius: radius.s, borderWidth: BORDER, borderColor: theme.line,
    paddingHorizontal: space[3], fontFamily: fonts.body, fontSize: 16, color: theme.ink,
    backgroundColor: theme.bg,
  },
  sendButton: {
    width: 48, height: 48, borderRadius: radius.s, borderWidth: BORDER, borderColor: theme.line,
    backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.5 },
})
