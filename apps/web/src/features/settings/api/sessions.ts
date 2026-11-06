import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { listSessions, revokeSession } from '@orbit/api/generated/sdk.gen'
import type { SessionRecord } from '@orbit/api/generated/types.gen'

export interface SessionView extends SessionRecord {
  current: boolean
  device: string
  browser: string
}

/** The device name while the server does not report one; the page shows it in the UI language. */
export const SIGNED_IN_DEVICE = 'Signed-in device'

export function sessionView(session: SessionRecord): SessionView {
  return { ...session, device: SIGNED_IN_DEVICE, browser: 'Orbit web' }
}

export function useSessions() {
  return useQuery({
    queryKey: queryKeys.sessions,
    queryFn: async () => {
      const { data } = await listSessions({ client: apiClient, throwOnError: true })
      if (!data) throw new Error('Sessions response was empty.')
      return data.map(sessionView)
    },
  })
}

export class SessionRevocationError extends Error {
  failedIds: string[]
  total: number

  constructor(failedIds: string[], total: number) {
    super(`${failedIds.length} of ${total} sessions could not be revoked.`)
    this.failedIds = failedIds
    this.total = total
  }
}

export function useRevokeSessions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (sessionIds: string[]) => {
      const failedIds: string[] = []
      for (const id of sessionIds) {
        try {
          await revokeSession({ client: apiClient, path: { id }, throwOnError: true })
        } catch {
          failedIds.push(id)
        }
      }
      if (failedIds.length > 0) throw new SessionRevocationError(failedIds, sessionIds.length)
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: queryKeys.sessions }),
  })
}
