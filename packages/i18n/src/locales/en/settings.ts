import account from './settings/account'
import content from './settings/content'
import team from './settings/team'
import workspace from './settings/workspace'

/** Workspace and account settings, split by page group (see `./settings/`). */
export default { ...workspace, ...team, ...account, ...content } as const
