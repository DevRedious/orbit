import chrome from './shell/chrome'
import commands from './shell/commands'
import components from './shell/components'
import features from './shell/features'

// The app frame, shortcuts, shared components and the small features around them; split by part to stay readable.
export default { ...chrome, ...commands, ...components, ...features } as const
