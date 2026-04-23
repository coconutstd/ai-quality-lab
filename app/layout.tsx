import type { Metadata } from 'next'
import Link from 'next/link'
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google'
import { QueryProvider } from '@/lib/query-provider'
import './globals.css'

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  axes: ['SOFT', 'opsz'],
  display: 'swap',
})

const plexSans = IBM_Plex_Sans({
  variable: '--font-plex-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AI Quality Lab — Field Notes',
  description:
    'Experiments on what AI must not compromise: types, security, a11y, i18n, review layers.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ko"
      className={`${fraunces.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          <SiteHeader />
          <main className="flex-1 w-full">{children}</main>
          <SiteFooter />
        </QueryProvider>
      </body>
    </html>
  )
}

function SiteHeader() {
  return (
    <header className="border-b border-[color:var(--rule-strong)] bg-[color:var(--paper)]/80 backdrop-blur sticky top-0 z-30">
      <div className="page-container py-4 flex items-end justify-between gap-6">
        <Link href="/posts" className="group block leading-none">
          <div className="eyebrow mb-1.5">AI Quality Lab · Vol. 01</div>
          <div className="display text-[28px] md:text-[32px]">
            Field <em>Notes</em>
          </div>
        </Link>
        <nav className="flex items-center gap-5 pb-1 text-[12px] font-mono">
          <NavLink href="/posts" label="Posts" index="01" />
          <NavLink href="/posts/new" label="Compose" index="02" />
          <NavLink href="/login" label="Sign-in" index="03" />
        </nav>
      </div>
    </header>
  )
}

function NavLink({
  href,
  label,
  index,
}: {
  href: string
  label: string
  index: string
}) {
  return (
    <Link
      href={href}
      className="group font-mono text-[12px] tracking-[0.14em] uppercase text-[color:var(--ink)] hover:text-[color:var(--vermillion)] transition-colors"
    >
      <span className="text-[color:var(--vermillion)] mr-1.5">{index}</span>
      <span className="border-b border-transparent group-hover:border-[color:var(--vermillion)] pb-0.5">
        {label}
      </span>
    </Link>
  )
}

function SiteFooter() {
  return (
    <footer className="border-t border-[color:var(--rule)] mt-20">
      <div className="page-container py-8 flex flex-wrap items-center justify-between gap-3 meta-line">
        <span>© MMXXVI · Quality Lab · Set in Fraunces & Plex</span>
        <span className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-[color:var(--vermillion)]" />
          Specimen · Paper Stock 70gsm
        </span>
      </div>
    </footer>
  )
}
