import type { Preview } from '@storybook/react-vite'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { setAdapter, consoleAdapter } from '../lib/analytics'
import '../app/globals.css'

// Storybook 환경에서는 트래킹 이벤트를 콘솔로 흘려서 디버그 가시성 확보
setAdapter(consoleAdapter)

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
    docs: { toc: true },
  },
  decorators: [
    (Story) => {
      // 매 스토리마다 fresh QueryClient — 캐시 priming은 개별 스토리에서
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })
      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      )
    },
  ],
}

export default preview
