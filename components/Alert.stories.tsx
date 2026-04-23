import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Alert } from './Alert'

const meta: Meta<typeof Alert> = {
  title: 'Components/Alert',
  component: Alert,
  parameters: {
    docs: {
      description: {
        component:
          "범용 Alert. `role=\"alert\"` + `aria-labelledby`/`aria-describedby` 로 스크린리더가 제목과 본문을 함께 읽도록 구성. " +
          "dismissible 시 닫기 버튼에 i18n 레이블 적용, analyticsId가 있으면 `alert.dismiss.click`을 track.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Alert>

export const Info: Story = {
  args: {
    variant: 'info',
    title: '알림',
    children: '안내 메시지입니다.',
  },
}

export const Error: Story = {
  args: {
    variant: 'error',
    title: '오류',
    children: '요청을 처리할 수 없습니다. 잠시 후 다시 시도해주세요.',
  },
}

export const Dismissible: Story = {
  args: {
    variant: 'warning',
    title: '주의',
    children: '이 경고는 닫을 수 있습니다.',
    dismissible: true,
    analyticsId: 'storybook-demo',
  },
  render: (args) => {
    function Wrapped() {
      const [open, setOpen] = useState(true)
      if (!open) return <p>닫힘</p>
      return <Alert {...args} onDismiss={() => setOpen(false)} />
    }
    return <Wrapped />
  },
}
