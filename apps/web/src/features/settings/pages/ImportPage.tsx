import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Import } from 'reicon-react'
import { SettingsCard } from '@/components/common/SettingsCard'
import { buttonVariants } from '@/components/ui/button'
import { RowIcon, SettingsRow } from '@/features/settings/components/SettingsParts'

/** Where to bring data into the workspace from other tools. Only Notion for now. */
export function ImportPage() {
  const { t } = useTranslation('settings')
  return (
    <SettingsCard title={t('import.title')} flush>
      <SettingsRow className="flex-nowrap">
        <RowIcon>
          <Import />
        </RowIcon>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-[13px]">
          <span className="font-medium text-foreground">Notion</span>
          <span className="text-xs text-muted-foreground">{t('import.notionDescription')}</span>
        </div>
        <Link to="/docs/import" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          {t('import.fromNotion')}
        </Link>
      </SettingsRow>
    </SettingsCard>
  )
}
