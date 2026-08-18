import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function useChannels(params = {}) {
  return useQuery({
    queryKey: ['channels', params],
    queryFn: () => api.channels.list(params),
  })
}

export function useChannel(id) {
  return useQuery({
    queryKey: ['channel', id],
    queryFn: () => api.channels.get(id),
    enabled: !!id,
  })
}

export function useFilters() {
  return useQuery({
    queryKey: ['filters'],
    queryFn: () => api.channels.filters(),
    staleTime: 0,
  })
}

export function useEPG(channelId) {
  return useQuery({
    queryKey: ['epg', channelId],
    queryFn: () => api.epg.get(channelId),
    enabled: !!channelId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useStats() {
  return useQuery({
    queryKey: ['sync-stats'],
    queryFn: () => api.sync.stats(),
    refetchInterval: 10000,
  })
}
