import api from './client'

/** Keep the request pending until there is data; never cache a loading marker as a successful result. */
export async function muatSaldoEasyBoss<T>(params: Record<string, string | number>, signal?: AbortSignal, timeoutMs = 240_000, pollMs = 3000): Promise<T> {
  const controller = new AbortController()
  let timedOut = false
  const cancel = () => controller.abort()
  signal?.addEventListener('abort', cancel, { once: true })
  if (signal?.aborted) cancel()
  const deadline = setTimeout(() => { timedOut = true; controller.abort() }, timeoutMs)
  try {
    while (!controller.signal.aborted) {
      const response = await api.get<T & { loading?: boolean }>('/saldo-easyboss', { params, signal: controller.signal })
      if (!response.data.loading) return response.data
      await new Promise<void>((resolve, reject) => {
        const stop = () => { clearTimeout(timer); reject(new Error('Pembacaan dibatalkan')) }
        const timer = setTimeout(() => { controller.signal.removeEventListener('abort', stop); resolve() }, pollMs)
        controller.signal.addEventListener('abort', stop, { once: true })
        if (controller.signal.aborted) stop()
      })
    }
    throw new Error('Pembacaan dibatalkan')
  } catch (error) {
    if (timedOut) throw new Error('Pembacaan EasyBoss belum selesai. Silakan coba lagi; tidak ada saldo yang dianggap nol.')
    throw error
  } finally {
    clearTimeout(deadline)
    signal?.removeEventListener('abort', cancel)
  }
}
