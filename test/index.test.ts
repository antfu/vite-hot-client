import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHotContext, getViteClient, guessBasesFromPathname, tryCreateHotContext } from '../src'

describe('guessBasesFromPathname', () => {
  it('returns root entries for "/"', () => {
    expect(guessBasesFromPathname('/')).toEqual(['/', '/'])
  })

  it('returns cumulative bases for nested path', () => {
    expect(guessBasesFromPathname('/foo/bar/baz')).toEqual([
      '/',
      '/foo',
      '/foo/bar',
      '/foo/bar/baz',
    ])
  })

  it('handles trailing slash', () => {
    expect(guessBasesFromPathname('/foo/')).toEqual(['/', '/foo', '/foo/'])
  })

  it('handles single-segment path', () => {
    expect(guessBasesFromPathname('/foo')).toEqual(['/', '/foo'])
  })
})

describe('getViteClient', () => {
  const fetchMock = vi.fn()
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

  beforeEach(() => {
    fetchMock.mockReset()
    consoleErrorSpy.mockClear()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function jsResponse(body: string) {
    return {
      headers: { get: () => 'application/javascript' },
      text: async () => body,
    }
  }

  function htmlResponse(body = '<!doctype html>...') {
    return {
      headers: { get: () => 'text/html' },
      text: async () => body,
    }
  }

  it('returns undefined and logs when response is HTML', async () => {
    fetchMock.mockResolvedValue(htmlResponse())
    const result = await getViteClient('/')
    expect(result).toBeUndefined()
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to import "/@vite/client"'),
    )
  })

  it('returns undefined and logs when content-type is not javascript', async () => {
    fetchMock.mockResolvedValue({
      headers: { get: () => 'text/plain' },
      text: async () => 'export const createHotContext = () => {}',
    })
    const result = await getViteClient('/')
    expect(result).toBeUndefined()
    expect(consoleErrorSpy).toHaveBeenCalled()
  })

  it('does not log when warning is false', async () => {
    fetchMock.mockResolvedValue(htmlResponse())
    const result = await getViteClient('/', false)
    expect(result).toBeUndefined()
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('uses the given base to construct the url', async () => {
    fetchMock.mockResolvedValue(htmlResponse())
    await getViteClient('/sub/')
    expect(fetchMock).toHaveBeenCalledWith('/sub/@vite/client')
  })

  it('swallows fetch errors and returns undefined', async () => {
    fetchMock.mockRejectedValue(new Error('network down'))
    const result = await getViteClient('/', false)
    expect(result).toBeUndefined()
  })

  it('proceeds to dynamic import when response looks like javascript', async () => {
    fetchMock.mockResolvedValue(jsResponse('export const createHotContext = () => ({})'))
    // The actual return value depends on whether the runtime can resolve the
    // @vite/client URL (in vitest, it can — a real module is returned). The
    // contract being tested is that getViteClient does not throw and proceeds
    // past the content-type guard.
    await expect(getViteClient('/', false)).resolves.toBeDefined()
  })
})

describe('createHotContext', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns undefined when the vite client cannot be loaded', async () => {
    fetchMock.mockResolvedValue({
      headers: { get: () => 'text/html' },
      text: async () => '<html></html>',
    })
    const result = await createHotContext('/some/path', '/')
    expect(result).toBeUndefined()
  })
})

describe('tryCreateHotContext', () => {
  const fetchMock = vi.fn()
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

  beforeEach(() => {
    fetchMock.mockReset()
    consoleErrorSpy.mockClear()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('iterates through provided bases and logs final failure', async () => {
    fetchMock.mockResolvedValue({
      headers: { get: () => 'text/html' },
      text: async () => '<html></html>',
    })
    const bases = ['/', '/foo', '/foo/bar']
    const result = await tryCreateHotContext('/___', bases)
    expect(result).toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(bases.length)
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/@vite/client')
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/foo@vite/client')
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/foo/bar@vite/client')
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[vite-hot-client] Failed to import vite client, tried with:',
      bases,
    )
  })

  it('falls back to guessBasesFromPathname when bases are not provided', async () => {
    fetchMock.mockResolvedValue({
      headers: { get: () => 'text/html' },
      text: async () => '<html></html>',
    })
    vi.stubGlobal('window', { location: { pathname: '/a/b' } })
    await tryCreateHotContext('/___')
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/@vite/client')
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/a@vite/client')
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/a/b@vite/client')
  })
})
