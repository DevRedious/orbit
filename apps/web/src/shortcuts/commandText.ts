import { i18n } from '@/i18n'
import type { Command, CommandId, Group } from './commands'

/** The title of a command in the UI language (`shell:commands.<id>`); `Command.title` stays the English one. */
export function commandTitle(command: Pick<Command, 'id'>): string {
  return i18n.t(`shell:commands.${command.id as CommandId}`)
}

/** The name of a group of commands in the UI language. */
export function commandGroupLabel(group: Group): string {
  return i18n.t(`shell:commandGroups.${group}`)
}
