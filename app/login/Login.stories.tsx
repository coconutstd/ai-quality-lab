import type { Meta, StoryObj } from '@storybook/react-vite'
import LoginPage from './page'

const meta: Meta<typeof LoginPage> = {
  title: 'Pages/Login',
  component: LoginPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'react-hook-form + zodResolver + TanStack Query mutation을 결합한 로그인 폼. ' +
          '`아무 값도 입력하지 않고 제출`을 시도하면 zod 메시지가 필드별 `aria-describedby`에 연결되어 표시된다.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof LoginPage>

export const Default: Story = {}

export const PreFilledForInteractionTesting: Story = {
  name: 'Pre-filled (interaction example)',
  parameters: {
    docs: {
      description: {
        story:
          '실제 로그인 흐름은 백엔드가 없어 실패하지만, ' +
          '폼 검증/`isPending`/`error.root` UI 흐름을 시각적으로 확인할 수 있다.',
      },
    },
  },
}
