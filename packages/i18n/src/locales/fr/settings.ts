import type { Translation } from '../../types'
import type source from '../en/settings'
import account from './settings/account'
import content from './settings/content'
import team from './settings/team'
import workspace from './settings/workspace'

export default { ...workspace, ...team, ...account, ...content } satisfies Translation<typeof source>
