const BASE = '/api'

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options)
  if (!res.ok) {
    let errMsg = `API error ${res.status}: ${path}`
    try {
      const errData = await res.json()
      if (errData?.error) errMsg = errData.error
    } catch {}
    throw new Error(errMsg)
  }
  return res.json()
}

export const api = {
  channels: {
    list: (params = {}) => {
      const cleanParams = new URLSearchParams()
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          cleanParams.set(k, String(v))
        }
      })
      return apiFetch('/channels?' + cleanParams.toString())
    },
    get: (id) => apiFetch(`/channels/${encodeURIComponent(id)}`),
    filters: (params = {}) => {
      const cleanParams = new URLSearchParams()
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          cleanParams.set(k, String(v))
        }
      })
      const qs = cleanParams.toString()
      return apiFetch('/channels/filters' + (qs ? `?${qs}` : ''))
    },
  },
  favorites: {
    list: () => apiFetch('/favorites'),
    add: (id) => apiFetch(`/favorites/${encodeURIComponent(id)}`, { method: 'POST' }),
    remove: (id) => apiFetch(`/favorites/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },
  epg: {
    get: (channelId) => apiFetch(`/epg/${encodeURIComponent(channelId)}`),
    sync: (region = 'IN1') => apiFetch(`/epg/sync/${encodeURIComponent(region)}`, { method: 'POST' }),
  },
  sync: {
    status: () => apiFetch('/sync/status'),
    stats: () => apiFetch('/sync/stats'),
    history: (limit = 10) => apiFetch(`/sync/history?limit=${limit}`),
    trigger: (sourceId) => apiFetch('/sync/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sourceId ? { sourceId } : {}),
    }),
  },
  sources: {
    list: () => apiFetch('/sources'),
    get: (id) => apiFetch(`/sources/${encodeURIComponent(id)}`),
    add: (data) => apiFetch('/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
    update: (id, data) => apiFetch(`/sources/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
    delete: (id, cleanStreams = true) => apiFetch(`/sources/${encodeURIComponent(id)}?cleanStreams=${Boolean(cleanStreams)}`, {
      method: 'DELETE',
    }),
    sync: (id, isAsync = false) => apiFetch(`/sources/${encodeURIComponent(id)}/sync?async=${Boolean(isAsync)}`, {
      method: 'POST',
    }),
    syncAll: (isAsync = false) => apiFetch(`/sources/sync-all?async=${Boolean(isAsync)}`, {
      method: 'POST',
    }),
    importDirect: (data) => apiFetch('/sources/import-direct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  },
  health: {
    check: (channelId) => apiFetch(`/health/${encodeURIComponent(channelId)}`, { method: 'POST' }),
  },
  export: {
    m3uUrl: (favoritesOnly = false) => `${BASE}/export/m3u?favoritesOnly=${Boolean(favoritesOnly)}`,
  },
  proxy: {
    streamUrl: (url, referrer, userAgent) => {
      const params = new URLSearchParams({ url })
      if (referrer) params.set('referrer', referrer)
      if (userAgent) params.set('userAgent', userAgent)
      return `/api/proxy/stream?${params}`
    },
    logoUrl: (channelId) => `/api/proxy/logo/${encodeURIComponent(channelId)}`,
  }
}
