import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSession } from '../src/session/SessionProvider'
import { Button, Field, Notice } from '../src/ui/components'
import { theme } from '../src/ui/theme'

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
      <ScrollView contentContainerStyle={[styles.page, { paddingTop: insets.top + 36, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Mihenk</Text>
          <Text style={styles.subtitle}>
            Okuduklarını takip et, ruh hâline göre öneri al, fiyatları izle.
          </Text>
        </View>

        <View style={styles.form}>
          {mode === 'signup' && (
            <Field label="Adın" value={displayName} onChangeText={setDisplayName}
              autoCapitalize="words" autoComplete="name" textContentType="name" />
          )}
          <Field label="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none"
            keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
          <Field label="Parola" value={password} onChangeText={setPassword} secureTextEntry
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
          {error ? <Notice message={error} /> : null}
          <Button label={mode === 'signin' ? 'Giriş yap' : 'Hesap oluştur'} onPress={() => void submit()} loading={busy} />
          <Pressable
            accessibilityRole="button"
            onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null) }}
          >
            <Text style={styles.switch}>
              {mode === 'signin' ? 'Hesabın yok mu? Hesap oluştur' : 'Hesabın var mı? Giriş yap'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.bg },
  page: { paddingHorizontal: 20, gap: 28 },
  header: { gap: 8 },
  title: { fontSize: 34, fontWeight: '800', color: theme.ink },
  subtitle: { fontSize: 16, color: theme.ink2, lineHeight: 22 },
  form: { gap: 14 },
  switch: { textAlign: 'center', color: theme.accent, fontWeight: '600', paddingVertical: 8 },
})
