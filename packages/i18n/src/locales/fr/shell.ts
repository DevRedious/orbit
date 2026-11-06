import type { Translation } from '../../types'
import type source from '../en/shell'
import chrome from './shell/chrome'
import commands from './shell/commands'
import components from './shell/components'
import features from './shell/features'

export default { ...chrome, ...commands, ...components, ...features } satisfies Translation<typeof source>
