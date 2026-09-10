import { useCallback, useEffect, useRef, useState } from 'react'

import {
  reconcilePlayerLocationTracking,
  startPlayerLocationTracking,
  stopPlayerLocationTracking,
} from './native-location-tracking'

export type PlayerLocationTrackingStatus =
  | 'checking'
  | 'inactive'
  | 'starting'
  | 'active'
  | 'stopping'
  | 'foreground-permission-denied'
  | 'background-permission-denied'
  | 'unavailable'

export function usePlayerLocationTracking(playerId: string | null) {
  const operationId = useRef(0)
  const [status, setStatus] = useState<PlayerLocationTrackingStatus>('checking')

  useEffect(() => {
    const currentOperationId = ++operationId.current

    if (!playerId) {
      setStatus('inactive')
      return
    }

    setStatus('checking')
    void reconcilePlayerLocationTracking(playerId).then((nextStatus) => {
      if (operationId.current === currentOperationId) setStatus(nextStatus)
    })

    return () => {
      operationId.current += 1
    }
  }, [playerId])

  const enable = useCallback(async () => {
    if (!playerId) return
    const currentOperationId = ++operationId.current
    setStatus('starting')

    const nextStatus = await startPlayerLocationTracking(playerId)
    if (operationId.current === currentOperationId) setStatus(nextStatus)
  }, [playerId])

  const disable = useCallback(async () => {
    const currentOperationId = ++operationId.current
    setStatus('stopping')

    const nextStatus = await stopPlayerLocationTracking()
    if (operationId.current === currentOperationId) setStatus(nextStatus)
  }, [])

  return { disable, enable, status }
}
