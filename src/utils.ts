import fs from 'node:fs'
import path from 'node:path'
import type { Readable, Stream } from 'node:stream'
import { fileURLToPath } from 'node:url'
import Debug from 'debug'
import { match } from 'path-to-regexp'
import colors from 'picocolors'
import type { ResolvedConfig } from 'vite'

export const isArray = <T = any>(val: unknown): val is T[] => Array.isArray(val)

export const isFunction = (val: unknown): val is Function =>
  typeof val === 'function'

export const isObject = (val: unknown): val is object =>
  Object.prototype.toString.call(val) === '[object Object]'

export const isEmptyObj = (val: unknown): boolean =>
  isObject(val) && Object.keys(val).length === 0

export const isStream = (stream: unknown): stream is Stream =>
  stream !== null &&
  typeof stream === 'object' &&
  typeof (stream as any).pipe === 'function'

export const isReadableStream = (stream: unknown): stream is Readable =>
  isStream(stream) &&
  (stream as any).readable !== false &&
  typeof (stream as any)._read === 'function' &&
  typeof (stream as any)._readableState === 'object'

export function sleep(timeout: number) {
  return new Promise((resolve) => setTimeout(resolve, timeout))
}

export function getDirname(importMetaUrl: string): string {
  return path.dirname(fileURLToPath(importMetaUrl))
}

export const debug = Debug('vite:plugin-mock-dev-server')

export const ensureArray = <T>(thing: T[] | T | undefined | null): T[] => {
  if (isArray(thing)) return thing
  if (thing === null || thing === undefined) return []
  return [thing as T]
}

export const log = {
  info(...args: any) {
    // eslint-disable-next-line no-console
    console.info(colors.cyan('mock-dev-server: '), ...args)
  },
  error(...args: any[]) {
    console.error('\n', colors.cyan('mock-dev-server: '), ...args, '\n')
  },
}

interface LookupFileOptions {
  pathOnly?: boolean
  rootDir?: string
  predicate?: (file: string) => boolean
}

export function lookupFile(
  dir: string,
  formats: string[],
  options?: LookupFileOptions,
): string | undefined {
  for (const format of formats) {
    const fullPath = path.join(dir, format)
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      const result = options?.pathOnly
        ? fullPath
        : fs.readFileSync(fullPath, 'utf-8')
      if (!options?.predicate || options.predicate(result)) {
        return result
      }
    }
  }
  const parentDir = path.dirname(dir)
  if (
    parentDir !== dir &&
    (!options?.rootDir || parentDir.startsWith(options?.rootDir))
  ) {
    return lookupFile(parentDir, formats, options)
  }
}

export const ensureProxies = (
  serverProxy: ResolvedConfig['server']['proxy'] = {},
): string[] => {
  const proxies: string[] = Object.keys(serverProxy)
    .map((key) => {
      const value = serverProxy[key]
      return typeof value === 'string'
        ? key
        : value.ws ||
          value.target?.toString().startsWith('ws:') ||
          value.target?.toString().startsWith('wss:')
        ? ''
        : key
    })
    .filter(Boolean)
  return proxies
}

export function parseParams(pattern: string, url: string): Record<string, any> {
  const urlMatch = match(pattern, { decode: decodeURIComponent })(url) || {
    params: {},
  }
  return urlMatch.params || {}
}
