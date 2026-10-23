import { Award, BookMarked, BookOpen, CalendarCheck, Compass, Flame, MessageSquare, PenLine, Star, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/** Rozet kodlarını tutarlı çizgi ikonlarla eşler; bilinmeyen rozet genel ödül ikonunu alır. */
const ICONS: Record<string, LucideIcon> = {
  first_shelf: BookOpen,
  first_review: PenLine,
  reader_5: BookMarked,
  reader_25: Award,
  genre_explorer: Compass,
  active_7: CalendarCheck,
  streak_7: Flame,
  critic_10: MessageSquare,
  ratings_10: Star,
  goal_getter: Target,
}

export function badgeTier(xpReward: number): 'gold' | 'silver' | 'bronze' {
  return xpReward >= 100 ? 'gold' : xpReward >= 60 ? 'silver' : 'bronze'
}

export function BadgeIcon({ code, earned, xpReward, size = 'md' }: { code: string; earned: boolean; xpReward: number; size?: 'md' | 'lg' }) {
  const Icon = ICONS[code] ?? Award
  return (
    <span className={`badge-icon badge-icon--${badgeTier(xpReward)} badge-icon--${size}${earned ? '' : ' is-locked'}`} aria-hidden="true">
      <Icon size={size === 'lg' ? 28 : 22} strokeWidth={2} />
    </span>
  )
}
