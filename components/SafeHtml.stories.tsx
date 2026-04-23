import type { Meta, StoryObj } from '@storybook/react-vite'
import { SafeHtml } from './SafeHtml'

const meta: Meta<typeof SafeHtml> = {
  title: 'Components/SafeHtml',
  component: SafeHtml,
  parameters: {
    docs: {
      description: {
        component:
          '사용자 작성 HTML을 DOMPurify로 sanitize해서 렌더한다. ' +
          '`dangerouslySetInnerHTML`은 이 컴포넌트 안에서만 사용되어 호출부 오용을 차단한다.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof SafeHtml>

export const WhitelistedMarkup: Story = {
  args: {
    html: '<p>일반 <strong>볼드</strong>와 <em>이탤릭</em>, 그리고 <a href="/x" title="링크">링크</a></p>',
  },
}

export const ScriptStripped: Story = {
  name: 'Script tag stripped',
  args: {
    html: '<p>안전한 텍스트</p><script>window.alert(1)</script>',
  },
  parameters: {
    docs: {
      description: {
        story: '`<script>` 태그는 sanitize 단계에서 제거되어 절대 실행되지 않는다.',
      },
    },
  },
}

export const InlineHandlerStripped: Story = {
  name: 'onclick handler stripped',
  args: {
    html: '<a href="/safe" onclick="alert(1)">클릭하세요</a>',
  },
}

export const RealWorldPost: Story = {
  args: {
    html: `
      <h2>2026년 1분기 회고</h2>
      <p>이번 분기 핵심 학습:</p>
      <ul>
        <li>테스트 안전망 위에서 <strong>리팩터링이 무섭지 않다</strong>는 감각</li>
        <li>패턴을 먼저 정착시키면 새 기능 보일러플레이트가 사라진다</li>
      </ul>
      <blockquote>"두려움이 사라지는 데 필요한 건 용기가 아니라 안전망이다"</blockquote>
    `,
  },
}

export const WithCustomClassName: Story = {
  args: {
    html: '<p>커스텀 클래스가 forward 되는지 확인</p>',
    className: 'prose',
  },
}
