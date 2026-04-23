import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { ConfirmDialog } from './ConfirmDialog'

const meta: Meta<typeof ConfirmDialog> = {
  title: 'Components/ConfirmDialog',
  component: ConfirmDialog,
  parameters: {
    docs: {
      description: {
        component:
          "파괴적 작업 앞의 확인 절차. role=\"dialog\" + aria-modal + aria-labelledby/describedby + 오픈 시 확인 버튼 포커스 + ESC 취소. " +
          "analyticsId가 있으면 open/confirm/cancel 이벤트 트래킹.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof ConfirmDialog>

export const Default: Story = {
  args: {
    open: true,
    title: '확인이 필요합니다',
    message: '이 작업을 진행하시겠습니까?',
  },
  render: (args) => {
    function Wrapped() {
      const [open, setOpen] = useState(args.open)
      const [result, setResult] = useState<string>('대기')
      return (
        <>
          <p>결과: {result}</p>
          <button type="button" onClick={() => { setOpen(true); setResult('열림') }}>
            다이얼로그 열기
          </button>
          <ConfirmDialog
            {...args}
            open={open}
            onConfirm={() => { setOpen(false); setResult('확인됨') }}
            onCancel={() => { setOpen(false); setResult('취소됨') }}
          />
        </>
      )
    }
    return <Wrapped />
  },
}

export const Danger: Story = {
  args: {
    open: true,
    variant: 'danger',
    title: '게시글 삭제',
    message: '"디자인 리뷰 메모" 글을 삭제합니다. 되돌릴 수 없습니다.',
    confirmLabel: '삭제',
    cancelLabel: '취소',
    analyticsId: 'storybook-delete',
  },
  render: (args) => {
    function Wrapped() {
      const [open, setOpen] = useState(true)
      if (!open) return <p>닫힘</p>
      return (
        <ConfirmDialog
          {...args}
          onConfirm={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      )
    }
    return <Wrapped />
  },
}

export const Confirming: Story = {
  args: {
    open: true,
    variant: 'danger',
    title: '삭제 진행 중',
    message: '네트워크 응답 대기 중인 상태를 재현합니다.',
    isConfirming: true,
  },
}
