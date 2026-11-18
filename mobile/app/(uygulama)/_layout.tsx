import { Tabs } from 'expo-router'
import { theme } from '../../src/ui/theme'

export default function AppTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.ink2,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        sceneStyle: { backgroundColor: theme.bg },
      }}
    >
      <Tabs.Screen name="kitaplik" options={{ title: 'Kitaplık' }} />
      <Tabs.Screen name="ekle" options={{ title: 'Kitap ekle' }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil' }} />
      <Tabs.Screen name="kitap/[id]" options={{ href: null, title: 'Kitap' }} />
    </Tabs>
  )
}
