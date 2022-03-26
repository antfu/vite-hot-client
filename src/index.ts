/// <reference types="vite/client" />

export type ViteHotContext = ImportMeta['hot']

export interface ViteClient {
  createHotContext(path: string): ViteHotContext
}

/**
 * Get the module of `/@vite/client`
 */
export async function getViteClient(): Promise<ViteClient | undefined> {
  try {
    return await import(/* @vite-ignore */ ['', '@vite', 'client'].join('/'))
  }
  catch {}
  return undefined
}

export async function createHotContext(path = '/____'): Promise<ViteHotContext | undefined> {
  const viteClient = await getViteClient()
  return viteClient?.createHotContext(path)
}

/** Anonymous hot context **/
export const hot = await createHotContext()
