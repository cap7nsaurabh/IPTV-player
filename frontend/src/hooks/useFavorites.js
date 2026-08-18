import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

export function useFavorites() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['favorites'],
    queryFn: api.favorites.list,
  })

  const add = useMutation({
    mutationFn: (id) => api.favorites.add(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      queryClient.invalidateQueries({ queryKey: ['channel'] })
      queryClient.invalidateQueries({ queryKey: ['sync-stats'] })
    },
  })

  const remove = useMutation({
    mutationFn: (id) => api.favorites.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      queryClient.invalidateQueries({ queryKey: ['channel'] })
      queryClient.invalidateQueries({ queryKey: ['sync-stats'] })
    },
  })

  const toggleFavorite = async (channelId, currentStatus) => {
    if (currentStatus) {
      return remove.mutateAsync(channelId)
    } else {
      return add.mutateAsync(channelId)
    }
  }

  const isFavorite = (channelId) => {
    if (!query.data || !Array.isArray(query.data)) return false
    return query.data.some(ch => ch.id === channelId)
  }

  return { ...query, add, remove, toggleFavorite, isFavorite }
}
