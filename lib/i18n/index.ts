import { Locale, MessageKey, messages } from './messages'

let currentLocale: Locale = 'ko'

export function setLocale(locale: Locale): void {
  currentLocale = locale
}

export function getLocale(): Locale {
  return currentLocale
}

// 누락 키는 ko로 fallback, 그래도 없으면 키 자체 반환 (개발 중 누락 식별 용이)
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const raw = messages[currentLocale][key] ?? messages.ko[key] ?? key
  if (!params) return raw
  return Object.entries(params).reduce<string>(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
    raw,
  )
}

export type { Locale, MessageKey } from './messages'
