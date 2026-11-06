// The chat catalog, one file per area of the chat screen.
import composer from './chat/composer'
import conversation from './chat/conversation'
import dialogs from './chat/dialogs'
import messages from './chat/messages'
import panes from './chat/panes'
import sidebar from './chat/sidebar'
import thread from './chat/thread'
import views from './chat/views'

export default { composer, conversation, dialogs, messages, panes, sidebar, thread, views } as const
