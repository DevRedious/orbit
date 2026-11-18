import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { validPrefix } from '@orbit/database/fields'

/** The prefix field of a unique ID property's menu: saved on Enter or blur; empty removes it. */
export function UniqueIdPrefix({ prefix, onSave }: { prefix: string | null; onSave: (prefix: string | null) => void }) {
  const { t } = useTranslation('database')
  const [text, setText] = useState(prefix ?? '')
  const save = () => {
    const next = text.trim()
    if ((next || null) === prefix) return
    if (next !== '' && !validPrefix(next)) {
      toast.error(t('uniqueId.invalidPrefix'))
      setText(prefix ?? '')
      return
    }
    onSave(next || null)
  }
  return (
    <div className="flex flex-col gap-1 p-1" onKeyDown={(event) => event.key !== 'Escape' && event.stopPropagation()}>
      <label className="px-1 text-xs text-muted-foreground" htmlFor="unique-id-prefix">
        {t('uniqueId.prefix')}
      </label>
      <Input
        id="unique-id-prefix"
        placeholder={t('uniqueId.none')}
        value={text}
        maxLength={10}
        onChange={(event) => setText(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === 'Enter') save()
        }}
      />
    </div>
  )
}
