import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Setting2 as Settings, TickCircle, User } from 'reicon-react'
import { cn } from 'cn'
import { SettingsCard } from '@/components/common/SettingsCard'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { LANGUAGE_LABELS, LANGUAGES, setLanguage, type Language } from '@/i18n'
import {
  APP_SECTIONS,
  DEFAULT_APP_LOOKS,
  setAppLook,
  setCustomTheme,
  themeName,
  useCustomThemeChoice,
  type AppSection,
} from '@/lib/customTheme'
import { CustomThemeDialog, CustomThemeSwatch } from '@/features/profile/components/CustomThemeDialog'
import { TEXT_SIZES, useTheme, type Appearance } from '@/lib/themeContext'

// Each option's label and description are `profile:appearance.<group>.<value>` keys, read at render.
const THEMES: { value: Appearance['theme']; preview: string }[] = [
  { value: 'light', preview: 'bg-white' },
  { value: 'system', preview: 'bg-linear-to-r from-white via-neutral-400 to-[#050505]' },
  { value: 'dark', preview: 'bg-[#181818]' },
]

const NAV_STYLES: Appearance['navStyle'][] = ['default', 'floating']

const STYLES: Appearance['style'][] = ['3d', 'flat']

// each tile draws its sample in its own font: `data-font` sets `--font-ui` there (index.css)
// Fonts go by their own names; only "System" is a `profile:appearance.font.system` key.
const FONT_OPTIONS: { value: Appearance['font']; label: string }[] = [
  { value: 'noto-sans', label: 'Noto Sans' },
  { value: 'geist', label: 'Geist' },
  { value: 'inter', label: 'Inter' },
  { value: 'ibm-plex-sans', label: 'IBM Plex Sans' },
  { value: 'system', label: 'System' },
  { value: 'literata', label: 'Literata' },
  { value: 'mono', label: 'Mono' },
]

// Their labels are `profile:appearance.textSize.<value>` keys.
const TEXT_SIZE_OPTIONS: { value: Appearance['textSize']; sample: string }[] = [
  { value: 'small', sample: 'text-sm' },
  { value: 'compact', sample: 'text-[0.9375rem]' },
  { value: 'default', sample: 'text-base' },
  { value: 'large', sample: 'text-lg' },
  { value: 'extra-large', sample: 'text-xl' },
]

/** Coolify's Profile → Appearance: how Orbit looks in this browser. */
export function AppearancePage() {
  const { t } = useTranslation('profile')
  const { appearance, setAppearance } = useTheme()
  const choice = useCustomThemeChoice()
  const appLooks = choice && 'apps' in choice ? choice.apps : null
  const customTheme = choice && !('apps' in choice) ? choice : null
  // the colour editor: for the whole app (Custom), or for one part of it (Per app)
  const [editing, setEditing] = useState<'all' | AppSection | null>(null)

  return (
    <>
      <LanguageCard />

      <SettingsCard title={t('appearance.colorTheme.title')} description={t('appearance.colorTheme.description')}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {THEMES.map((option) => (
            <AppearanceOption
              key={option.value}
              label={t(`appearance.colorTheme.${option.value}.label`)}
              description={t(`appearance.colorTheme.${option.value}.description`)}
              selected={!choice && appearance.theme === option.value}
              onClick={() => {
                setCustomTheme(null)
                setAppearance({ theme: option.value })
              }}
              previewClassName={option.preview}
            >
              <span className="h-8 w-20 rounded-md border border-black/10 bg-neutral-100/80 shadow-sm dark:border-white/10 dark:bg-black/20" />
            </AppearanceOption>
          ))}
          {/* the custom theme opens its editor: it is a theme of its own, and picking one above turns it off */}
          <AppearanceOption
            label={customTheme ? t('appearance.colorTheme.customNamed', { name: themeName(customTheme) }) : t('appearance.colorTheme.custom')}
            description={t('appearance.colorTheme.customDescription')}
            selected={Boolean(customTheme)}
            aria-haspopup="dialog"
            onClick={() => setEditing('all')}
          >
            <CustomThemeSwatch theme={customTheme} className="h-12 w-24" />
          </AppearanceOption>
          <AppearanceOption
            label={t('appearance.colorTheme.perApp')}
            description={t('appearance.colorTheme.perAppDescription')}
            selected={Boolean(appLooks)}
            onClick={() => {
              if (!appLooks) setCustomTheme({ apps: DEFAULT_APP_LOOKS })
            }}
            previewClassName="gap-1.5"
          >
            {APP_SECTIONS.map((section) => (
              <CustomThemeSwatch key={section} theme={(appLooks ?? DEFAULT_APP_LOOKS)[section]} className="h-10 w-9" />
            ))}
          </AppearanceOption>
        </div>
      </SettingsCard>

      {appLooks ? (
        <SettingsCard title={t('appearance.perApp.title')} description={t('appearance.perApp.description')}>
          <div className="grid gap-3 sm:grid-cols-3">
            {APP_SECTIONS.map((section) => (
              <AppearanceOption
                key={section}
                label={t(`appearance.sections.${section}`)}
                description={themeName(appLooks[section])}
                aria-haspopup="dialog"
                onClick={() => setEditing(section)}
              >
                <CustomThemeSwatch theme={appLooks[section]} className="h-12 w-24" />
              </AppearanceOption>
            ))}
          </div>
        </SettingsCard>
      ) : null}

      <SettingsCard title={t('appearance.navStyle.title')} description={t('appearance.navStyle.description')}>
        <div className="grid gap-3 sm:grid-cols-2">
          {NAV_STYLES.map((navStyle) => {
            const floating = navStyle === 'floating'
            return (
              <AppearanceOption
                key={navStyle}
                label={t(`appearance.navStyle.${navStyle}.label`)}
                description={t(`appearance.navStyle.${navStyle}.description`)}
                selected={appearance.navStyle === navStyle}
                onClick={() => setAppearance({ navStyle })}
                previewClassName={cn('items-stretch justify-start', floating && 'gap-1.5 p-1.5')}
              >
                <span className={cn('flex flex-col items-center gap-1.5 bg-background px-2 py-2', floating ? 'rounded-lg border' : 'border-r')}>
                  {[User, Settings].map((Icon, index) => (
                    <span key={index} className="flex size-6 items-center justify-center rounded-md border bg-muted/50 text-muted-foreground">
                      <Icon className="size-3.5" />
                    </span>
                  ))}
                </span>
                <span className={cn('flex-1 bg-background', floating && 'rounded-lg border')} />
              </AppearanceOption>
            )
          })}
        </div>
      </SettingsCard>

      <SettingsCard title={t('appearance.style.title')} description={t('appearance.style.description')}>
        <div className="grid gap-3 sm:grid-cols-2">
          {STYLES.map((style) => {
            const tiles = style === '3d'
            return (
              <AppearanceOption
                key={style}
                label={t(`appearance.style.${style}.label`)}
                description={t(`appearance.style.${style}.description`)}
                selected={appearance.style === style}
                onClick={() => setAppearance({ style })}
                previewClassName="flex-col items-start gap-1.5 px-4"
              >
                {[User, Settings].map((Icon, index) => (
                  <span key={index} className={cn('flex items-center gap-2 rounded-md text-muted-foreground', !tiles && 'px-1.5 py-1', !tiles && index === 0 && 'bg-black/5 dark:bg-white/8')}>
                    <span className={cn('flex items-center justify-center', tiles && 'size-6 rounded-md border bg-background shadow-[0_2px_0_rgb(0_0_0/0.22)] dark:shadow-[0_2px_0_rgb(255_255_255/0.08)]')}>
                      <Icon className="size-3.5" />
                    </span>
                    <span className="h-1.5 w-16 rounded-full bg-muted-foreground/25" />
                  </span>
                ))}
              </AppearanceOption>
            )
          })}
        </div>
      </SettingsCard>

      <SettingsCard title={t('appearance.font.title')} description={t('appearance.font.description')}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {FONT_OPTIONS.map((option) => (
            <AppearanceOption
              key={option.value}
              label={option.value === 'system' ? t('appearance.font.system') : option.label}
              selected={appearance.font === option.value}
              onClick={() => setAppearance({ font: option.value })}
            >
              <span data-font={option.value} className="font-(family-name:--font-ui) text-3xl text-foreground">Ag</span>
            </AppearanceOption>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard title={t('appearance.textSize.title')} description={t('appearance.textSize.description')}>
        <ToggleGroup
          aria-label={t('appearance.textSize.title')}
          spacing={1}
          className="w-full rounded-[10px] border bg-card p-1"
          value={[appearance.textSize]}
          onValueChange={(value: string[]) => {
            // a press on the chosen size must not leave none chosen
            const next = TEXT_SIZES.find((size) => size === value.at(-1))
            if (next) setAppearance({ textSize: next })
          }}
        >
          {TEXT_SIZE_OPTIONS.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              className="h-auto min-w-0 flex-1 shrink flex-col gap-0.5 px-1 py-2 font-normal whitespace-normal text-muted-foreground aria-pressed:text-foreground"
            >
              <span aria-hidden="true" className={cn('leading-none', option.sample)}>Aa</span>
              <span className="text-xs max-sm:text-[0.6875rem]">{t(`appearance.textSize.${option.value}`)}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </SettingsCard>

      {editing === 'all' ? (
        <CustomThemeDialog
          open
          onOpenChange={(open) => !open && setEditing(null)}
          title={t('customTheme.title')}
          description={t('customTheme.description')}
          value={customTheme}
          onSave={setCustomTheme}
        />
      ) : editing ? (
        <CustomThemeDialog
          open
          onOpenChange={(open) => !open && setEditing(null)}
          title={t('appearance.perApp.dialogTitle', { section: t(`appearance.sections.${editing}`) })}
          description={t('appearance.perApp.dialogDescription', { section: t(`appearance.sections.${editing}`).toLowerCase() })}
          value={appLooks?.[editing] ?? null}
          onSave={(theme) => setAppLook(editing, theme)}
        />
      ) : null}
    </>
  )
}

// Each language is listed in its own name, so anyone can find theirs whatever the UI language is.
const LANGUAGE_OPTIONS = LANGUAGES.map((value) => ({ value, label: LANGUAGE_LABELS[value] }))

/** The UI language for this browser. Hidden until a second language ships. */
function LanguageCard() {
  const { t, i18n } = useTranslation('profile')
  if (LANGUAGE_OPTIONS.length < 2) return null
  return (
    <SettingsCard title={t('appearance.language.title')} description={t('appearance.language.description')}>
      {/* `items` lets SelectValue show the option label instead of the raw value. */}
      <Select items={LANGUAGE_OPTIONS} value={i18n.resolvedLanguage} onValueChange={(value) => setLanguage(value as Language)}>
        <SelectTrigger aria-label={t('appearance.language.title')} className="w-full sm:w-64">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value} lang={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SettingsCard>
  )
}

/** One choice: a picture of the look, its name, and a check when it is the current one. */
function AppearanceOption({
  label,
  description,
  selected,
  previewClassName,
  children,
  ...props
}: Omit<React.ComponentProps<'button'>, 'children'> & {
  label: string
  description?: string
  /** `undefined` for a card that opens a dialog instead of being chosen. */
  selected?: boolean
  previewClassName?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      data-slot="appearance-option"
      aria-pressed={selected}
      className="group/option min-w-0 overflow-hidden rounded-[10px] border border-border bg-card text-left outline-none transition-[border-color,box-shadow] hover:border-foreground/20 hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-primary aria-pressed:bg-primary/6 aria-pressed:ring-2 aria-pressed:ring-primary/25"
      {...props}
    >
      <span aria-hidden="true" className={cn('flex h-20 items-center justify-center border-b border-border bg-muted/40', previewClassName)}>
        {children}
      </span>
      <span className="block p-3">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-foreground">{label}</span>
          <TickCircle className="hidden size-4 shrink-0 text-primary group-aria-pressed/option:block" />
        </span>
        {description ? <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span> : null}
      </span>
    </button>
  )
}
