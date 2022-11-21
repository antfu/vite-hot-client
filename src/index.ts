/// <reference types="vite/client" />

export type ViteHotContext = Exclude<ImportMeta['hot'], undefined>

export interface ViteClient {
  createHotContext(path: string): ViteHotContext
}

/**
 * Get the module of `/@vite/client`
 */
export async function getViteClient(base = '/'): Promise<ViteClient | undefined> {
  try {
    return await import(/* @vite-ignore */ `${base}@vite/client`)
  }
  catch {}
  return undefined
}

export async function createHotContext(path = '/____', base = '/'): Promise<ViteHotContext | undefined> {
  const viteClient = await getViteClient(base)
  return viteClient?.createHotContext(path)
}

/** Anonymous hot context **/
export const hot = await createHotContext()
