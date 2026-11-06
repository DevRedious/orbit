import admin from './admin'
import auth from './auth'
import chat from './chat'
import common from './common'
import docs from './docs'
import errors from './errors'
import profile from './profile'
import settings from './settings'
import shell from './shell'
import tasks from './tasks'
import views from './views'

export const fr = { common, errors, shell, auth, profile, admin, tasks, views, settings, docs, chat } as const
