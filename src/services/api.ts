import axios, { type AxiosAdapter } from 'axios'
import { useAuth, useDB } from '@/app/store'

/**
 * Axios instance for the whole app.
 * - When VITE_API_URL is set, requests go to the real backend.
 * - Otherwise a mock adapter serves REST-style calls (/patients, /patients/:id …) from the local store,
 *   so the UI can be developed and demoed without a server.
 */
const mockAdapter: AxiosAdapter = async config => {
  await new Promise(r => setTimeout(r, 350))
  const [, coll, id] = (config.url || '').split('?')[0].split('/')
  const st = useDB.getState()
  const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
  let data: any = null, status = 200
  const list = st.db[coll]
  if (!list) status = 404
  else if (config.method === 'get') data = id ? list.find((x: any) => x.id === id) : list
  else if (config.method === 'post') { st.add(coll, body); data = body; status = 201 }
  else if (config.method === 'put' || config.method === 'patch') { st.update(coll, id, body); data = body }
  else if (config.method === 'delete') st.remove(coll, id)
  if (status === 404) return Promise.reject(Object.assign(new Error('Not found'), { response: { status, data: null }, config }))
  return { data, status, statusText: 'OK', headers: {}, config }
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  adapter: import.meta.env.VITE_API_URL ? undefined : mockAdapter,
})

api.interceptors.request.use(cfg => {
  const user = useAuth.getState().user
  if (user) cfg.headers.set('Authorization', `Bearer demo-token-${user.id}`)
  return cfg
})
api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) useAuth.getState().logout()
  return Promise.reject(err)
})

/** Simple in-memory cache for master data (doctors, services, tests…). */
const cache = new Map<string, { at: number; data: any }>()
export async function getCached<T = any>(url: string, ttl = 5 * 60_000): Promise<T> {
  const hit = cache.get(url)
  if (hit && Date.now() - hit.at < ttl) return hit.data
  const { data } = await api.get(url)
  cache.set(url, { at: Date.now(), data })
  return data
}
