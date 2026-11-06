import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Setting2 as Settings, TickCircle, User } from 'reicon-react'
import { cn } from 'cn'
import { SettingsCard } from '@/components/common/SettingsCard'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LANGUAGE_LABELS, LANGUAGES, setLanguage, type Language } from '@/i18n'
import { CUSTOM_THEME_PRESETS, serializeCustomTheme, setCustomTheme, useCustomTheme } from '@/lib/customTheme'
import { CustomThemeDialog, CustomThemeSwatch } from '@/features/profile/components/CustomThemeDialog'
import { useTheme, type Appearance } from '@/lib/themeContext'

// Each option's label and description are `profile:appearance.<group>.<value>` keys, read at render.
const THEMES: { value: Appearance['theme']; preview: string }[] = [
  { value: 'light', preview: 'bg-white' },
  { value: 'system', preview: 'bg-linear-to-r from-white via-neutral-400 to-[#050505]' },
  { value: 'dark', preview: 'bg-[#181818]' },
]

const LAYOUTS: Appearance['layout'][] = ['classic', 'new']

const NAV_STYLES: Appearance['navStyle'][] = ['default', 'floating']

const STYLES: Appearance['style'][] = ['3d', 'flat']

/** Coolify's Profile → Appearance: how Orbit looks in this browser. */
export function AppearancePage() {
  const { t } = useTranslation('profile')
  const { appearance, setAppearance } = useTheme()
  const customTheme = useCustomTheme()
  // in the new UI the custom theme replaces the colour theme; in the classic layout it colours chat on top of it
  const newUi = appearance.layout === 'new'
  const [customThemeOpen, setCustomThemeOpen] = useState(false)
  const customThemeName = customTheme
    ? (CUSTOM_THEME_PRESETS.find((preset) => serializeCustomTheme(preset.theme) === serializeCustomTheme(customTheme))?.name ?? t('appearance.colorTheme.yourColors'))
    : null

  return (
    <>
      <LanguageCard />

      <SettingsCard title={t('appearance.layout.title')}>
        <div className="grid gap-3 sm:grid-cols-2">
          {LAYOUTS.map((layout) => {
            const contextual = layout === 'new'
            return (
              <AppearanceOption
                key={layout}
                label={t(`appearance.layout.${layout}.label`)}
                description={t(`appearance.layout.${layout}.description`)}
                selected={appearance.layout === layout}
                onClick={() => setAppearance({ layout })}
                previewClassName="items-stretch justify-start"
              >
                {/* the sidebar: app icons, or Back and the page's list; classic adds a second list column */}
                <span className="flex w-14 flex-col gap-1.5 border-r bg-background px-2 py-2">
                  {contextual ? (
                    <>
                      <span className="flex h-3 items-center gap-1 text-muted-foreground"><ChevronDown className="size-2.5 rotate-90" /><span className="h-1 flex-1 rounded-full bg-muted-foreground/30" /></span>
                      {[0, 1, 2].map((index) => <span key={index} className={cn('h-1.5 rounded-full bg-muted-foreground/25', index === 0 && 'bg-primary/50')} />)}
                    </>
                  ) : (
                    [User, Settings].map((Icon, index) => (
                      <span key={index} className="flex size-5 items-center justify-center rounded-md border bg-muted/50 text-muted-foreground">
                        <Icon className="size-3" />
                      </span>
                    ))
                  )}
                </span>
                {contextual ? null : (
                  <span className="flex w-12 flex-col gap-1.5 border-r px-2 py-2">
                    {[0, 1, 2].map((index) => <span key={index} className={cn('h-1.5 rounded-full bg-muted-foreground/25', index === 0 && 'bg-primary/50')} />)}
                  </span>
                )}
                <span className="flex-1 bg-background" />
              </AppearanceOption>
            )
          })}
        </div>
      </SettingsCard>

      <SettingsCard title={t('appearance.colorTheme.title')} description={t('appearance.colorTheme.description')}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {THEMES.map((option) => (
            <AppearanceOption
              key={option.value}
              label={t(`appearance.colorTheme.${option.value}.label`)}
              description={t(`appearance.colorTheme.${option.value}.description`)}
              selected={!(newUi && customTheme) && appearance.theme === option.value}
              onClick={() => {
                if (newUi) setCustomTheme(null)
                setAppearance({ theme: option.value })
              }}
              previewClassName={option.preview}
            >
              <span className="h-8 w-20 rounded-md border border-black/10 bg-neutral-100/80 shadow-sm dark:border-white/10 dark:bg-black/20" />
            </AppearanceOption>
          ))}
          {/* the custom theme opens its editor. New UI: it is a theme of its own, and picking one above turns it off.
              Classic: it colours chat on top of the theme above, so it is never the chosen one */}
          <AppearanceOption
            label={customTheme ? t('appearance.colorTheme.customNamed', { name: customThemeName ?? '' }) : t('appearance.colorTheme.custom')}
            description={newUi ? t('appearance.colorTheme.customDescriptionNew') : t('appearance.colorTheme.customDescriptionClassic')}
            selected={newUi ? Boolean(customTheme) : undefined}
            aria-haspopup="dialog"
            onClick={() => setCustomThemeOpen(true)}
          >
            <CustomThemeSwatch theme={customTheme} className="h-12 w-24" />
          </AppearanceOption>
        </div>
      </SettingsCard>

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
                previewClassName={cn('items-stretch justify-start', floating && 'gap-1.5 bg-[radial-gradient(circle,rgb(0_0_0/0.13)_1px,transparent_1.3px)] bg-size-[10px_10px] p-1.5 dark:bg-[radial-gradient(circle,rgb(255_255_255/0.09)_1px,transparent_1.3px)]')}
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

      {customThemeOpen ? <CustomThemeDialog open onOpenChange={setCustomThemeOpen} /> : null}
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
  description: string
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
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
    </button>
  )
}
