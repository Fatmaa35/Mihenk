import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSession } from '../src/session/SessionProvider'
import { Button, Card, Field, Notice } from '../src/ui/components'
import { fonts, space, theme } from '../src/ui/theme'

type Mode = 'signin' | 'signup'

export default function GirisScreen() {
  const { signIn, signUp } = useSession()
  const insets = useSafeAreaInsets()
  const [mode, setMode] = useState<Mode>('signin')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setError(null)
    if (mode === 'signup' && displayName.trim().length < 2) {
      return setError('Adını yazar mısın? En az iki harf olmalı.')
    }
    if (!email.includes('@')) return setError('E-posta adresini kontrol et.')
    if (password.length < 8) return setError('Parola en az sekiz karakter olmalı.')
    setBusy(true)
    try {
      if (mode === 'signin') await signIn(email, password)
      else await signUp(displayName, email, password)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Giriş yapılamadı.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + space[6], paddingBottom: insets.bottom + space[5] },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.brand}>Mihenk</Text>
          <Text style={styles.tagline}>
            Okuduklarını takip et, ruh hâline göre öneri al, fiyatları izle.
          </Text>
        </View>

        <Card>
          <Text style={styles.cardTitle}>{mode === 'signin' ? 'Giriş yap' : 'Hesap oluştur'}</Text>
          {mode === 'signup' && (
            <Field label="Adın" value={displayName} onChangeText={setDisplayName}
              autoCapitalize="words" autoComplete="name" textContentType="name" />
          )}
          <Field label="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none"
            keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
          <Field label="Parola" value={password} onChangeText={setPassword} secureTextEntry
            hint={mode === 'signup' ? 'En az sekiz karakter.' : undefined}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
          {error ? <Notice message={error} /> : null}
          <View style={styles.action}>
            <Button label={mode === 'signin' ? 'Giriş yap' : 'Hesap oluştur'} onPress={() => void submit()} loading={busy} />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null) }}
          >
            <Text style={styles.switch}>
              {mode === 'signin' ? 'Hesabın yok mu? Hesap oluştur' : 'Hesabın var mı? Giriş yap'}
            </Text>
          </Pressable>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.bg },
  page: { paddingHorizontal: space[4], gap: space[5] },
  header: { gap: space[2] },
  brand: { fontFamily: fonts.displayExtra, fontSize: 40, color: theme.ink, letterSpacing: -1 },
  tagline: { fontFamily: fonts.body, fontSize: 16, color: theme.ink2, lineHeight: 23 },
  cardTitle: { fontFamily: fonts.display, fontSize: 20, color: theme.ink, marginBottom: space[1] },
  action: { marginTop: space[2] },
  switch: {
    textAlign: 'center', color: theme.accentSoftInk, fontFamily: fonts.bodyBold,
    paddingVertical: space[2], fontSize: 15,
  },
})
