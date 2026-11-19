import { Feather } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { View } from 'react-native'
import { fonts, radius, theme } from '../../src/ui/theme'

/** Web'deki alt çubuğun karşılığı: etkin sekmenin simgesi leylak bir hapın içinde. */
function TabIcon({ name, focused }: { name: keyof typeof Feather.glyphMap; focused: boolean }) {
  return (
    <View style={{
      paddingHorizontal: 16, paddingVertical: 5, borderRadius: radius.pill,
      backgroundColor: focused ? theme.accentSoft : 'transparent',
    }}>
      <Feather name={name} size={21} color={focused ? theme.accentSoftInk : theme.ink2} />
    </View>
  )
}

export default function AppTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.ink,
        tabBarInactiveTintColor: theme.ink2,
        tabBarStyle: {
          backgroundColor: theme.surface, borderTopWidth: 2, borderTopColor: theme.line,
          height: 68, paddingTop: 6,
        },
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 12, marginTop: 2 },
        sceneStyle: { backgroundColor: theme.bg },
      }}
    >
      <Tabs.Screen
        name="kitaplik"
        options={{
          title: 'Kitaplık',
          tabBarIcon: ({ focused }) => <TabIcon name="book-open" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="ekle"
        options={{
          title: 'Kitap ekle',
          tabBarIcon: ({ focused }) => <TabIcon name="plus-circle" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ focused }) => <TabIcon name="user" focused={focused} />,
        }}
      />
    </Tabs>
  )
}
