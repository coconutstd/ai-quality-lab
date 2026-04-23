import { EventMap, EventName } from './events'

export type Adapter = <K extends EventName>(event: K, props: EventMap[K]) => void

const noopAdapter: Adapter = () => {
  /* no-op — 프로덕션에서 setAdapter로 Sentry/GA/PostHog 어댑터 주입 */
}

let currentAdapter: Adapter = noopAdapter

export function setAdapter(adapter: Adapter): void {
  currentAdapter = adapter
}

export function getAdapter(): Adapter {
  return currentAdapter
}

// 타입 안전한 트래킹 진입점 — 잘못된 이벤트 이름이나 properties shape는 컴파일 에러
export function track<K extends EventName>(event: K, props: EventMap[K]): void {
  try {
    currentAdapter(event, props)
  } catch {
    /* 트래킹 실패가 사용자 흐름을 막지 않도록 swallow */
  }
}

export const consoleAdapter: Adapter = (event, props) => {
  console.log(`[track] ${event}`, props)
}

export type { EventName, EventMap } from './events'
