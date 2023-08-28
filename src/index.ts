/// <reference types="vite/client" />

export type ViteHotContext = Exclude<ImportMeta['hot'], undefined>

export interface ViteClient {
  createHotContext(path: string): ViteHotContext
}

/**
 * Get the module of `/@vite/client`
 */
export async function getViteClient(base = '/', warning = true): Promise<ViteClient | undefined> {
  try {
    const url = `${base}@vite/client`

    // pre-verify if the url is valid
    const res = await fetch(url)
    const text = await res.text()
    if (text.startsWith('<') || !res.headers.get('content-type')?.includes('javascript'))
      throw new Error('Not javascript')

    return await import(/* @vite-ignore */ url)
  }
  catch {
    if (warning)
      console.error(`[vite-hot-client] Failed to import "${base}@vite/client"`)
  }
  return undefined
}

export async function createHotContext(path = '/____', base = '/'): Promise<ViteHotContext | undefined> {
  const viteClient = await getViteClient(base)
  return viteClient?.createHotContext(path)
}

/**
 * Guess the vite client provided bases from the current pathname.
 */
export function guessBasesFromPathname(pathname = window.location.pathname) {
  return pathname.split('/').map((i, idx, arr) => arr.slice(0, idx + 1).join('/') || '/')
}

/**
 * Try to resolve the vite client provided bases.
 */
export async function tryCreateHotContext(path = '/___', bases?: string[]): Promise<ViteHotContext | undefined> {
  bases = bases ?? guessBasesFromPathname()
  for (const base of bases) {
    const viteClient = await getViteClient(base, false)
    const hot = viteClient?.createHotContext(path)
    if (hot)
      return hot
  }
  console.error('[vite-hot-client] Failed to import vite client, tried with:', bases)
}
