import {
  ArrowCircleDown,
  ArrowRightUp,
  Search,
  Calculator,
  Barcode,
  Call,
  Paperclip,
  Sms,
  Calendar,
  CheckSquare,
  Clock,
  Hashtag,
  Link,
  List,
  Flash,
  RecordCircle,
  Text,
  TextalignJustifyleft,
  User,
  UserCircle,
  type IconComponent,
} from 'reicon-react'
import type { DatabasePropertyType } from '@orbit/database/types'
import { propertyTypeLabel } from './labels'

/** A type's icon, and its name in the UI language (read when shown, so it follows a language change). */
function entry(type: DatabasePropertyType, icon: IconComponent): { label: string; icon: IconComponent } {
  return {
    icon,
    get label() {
      return propertyTypeLabel(type)
    },
  }
}

export const PROPERTY_TYPES: Record<DatabasePropertyType, { label: string; icon: IconComponent }> = {
  title: entry('title', Text),
  text: entry('text', TextalignJustifyleft),
  number: entry('number', Hashtag),
  select: entry('select', ArrowCircleDown),
  multi_select: entry('multi_select', List),
  status: entry('status', RecordCircle),
  date: entry('date', Calendar),
  person: entry('person', User),
  checkbox: entry('checkbox', CheckSquare),
  url: entry('url', Link),
  email: entry('email', Sms),
  phone: entry('phone', Call),
  files: entry('files', Paperclip),
  unique_id: entry('unique_id', Barcode),
  created_time: entry('created_time', Clock),
  created_by: entry('created_by', UserCircle),
  last_edited_time: entry('last_edited_time', Clock),
  last_edited_by: entry('last_edited_by', UserCircle),
  button: entry('button', Flash),
  formula: entry('formula', Calculator),
  relation: entry('relation', ArrowRightUp),
  rollup: entry('rollup', Search),
}

/** The types a user can give a property, in menu order (a database has exactly one title). */
export const CREATABLE_TYPES: DatabasePropertyType[] = [
  'text',
  'number',
  'select',
  'multi_select',
  'status',
  'date',
  'person',
  'checkbox',
  'url',
  'email',
  'phone',
  'files',
  'unique_id',
  'formula',
  'created_time',
  'created_by',
  'last_edited_time',
  'last_edited_by',
  'button',
]

/** Types offered only for a new property: the server refuses a type change to them (their config names other properties). */
export const NEW_ONLY_TYPES: DatabasePropertyType[] = ['relation', 'rollup']
