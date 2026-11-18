import account from './settings/account'
import content from './settings/content'
import mail from './settings/mail'
import orbitImport from './settings/orbitImport'
import roles from './settings/roles'
import team from './settings/team'
import webhooks from './settings/webhooks'
import workspace from './settings/workspace'

/** Workspace and account settings, split by page group (see `./settings/`). */
export default { ...workspace, ...team, ...account, ...content, ...roles, ...webhooks, ...mail, ...orbitImport } as const
