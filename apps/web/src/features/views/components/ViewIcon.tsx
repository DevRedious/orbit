import {
  Book,
  Bookmark,
  Box,
  Briefcase,
  Bug,
  Chart,
  Code,
  Cup,
  Flag,
  Flash,
  Folder,
  Heart,
  Hierarchy,
  Lamp,
  Layer,
  Rocket,
  Star,
  Tag,
  Target,
  Timer,
  type IconComponent,
} from 'reicon-react'
import { cn } from 'cn'

/** Stored in `saved_views.icon` by key; unknown or null keys render the Layer glyph. Names live in `views:saveDialog.icons`. */
export const VIEW_ICONS = {
  layer: Layer,
  star: Star,
  flag: Flag,
  bug: Bug,
  rocket: Rocket,
  target: Target,
  flash: Flash,
  heart: Heart,
  bookmark: Bookmark,
  box: Box,
  code: Code,
  folder: Folder,
  tag: Tag,
  timer: Timer,
  chart: Chart,
  lamp: Lamp,
  cup: Cup,
  briefcase: Briefcase,
  book: Book,
  hierarchy: Hierarchy,
} satisfies Record<string, IconComponent>
export type ViewIconName = keyof typeof VIEW_ICONS
export const VIEW_ICON_NAMES = Object.keys(VIEW_ICONS) as ViewIconName[]
const iconByName: Readonly<Record<string, IconComponent | undefined>> = VIEW_ICONS

export type ViewColorName = 'pink' | 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'gray'

/** Pink (the app's primary) first; the rest match the status palette's calmer hues. Names live in `views:saveDialog.colors`. */
export const VIEW_COLORS: Array<{ value: string; name: ViewColorName }> = [
  { value: '#e0457b', name: 'pink' },
  { value: '#eb5757', name: 'red' },
  { value: '#f2994a', name: 'orange' },
  { value: '#f2c94c', name: 'yellow' },
  { value: '#4cb782', name: 'green' },
  { value: '#26b5ce', name: 'teal' },
  { value: '#5e6ad2', name: 'blue' },
  { value: '#8b8f98', name: 'gray' },
]

export function ViewIcon({ icon, color, className }: { icon: string | null | undefined; color: string | null | undefined; className?: string }) {
  const Icon = (icon ? iconByName[icon] : undefined) ?? Layer
  return <Icon aria-hidden="true" className={cn('size-4 shrink-0', !color && 'text-muted-foreground', className)} style={color ? { color } : undefined} />
}
