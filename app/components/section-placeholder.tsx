import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Action = {
  label: string
  href: string
}

export default function SectionPlaceholder({
  title,
  description,
  bullets,
  actions,
}: {
  title: string
  description: string
  bullets: string[]
  actions: Action[]
}) {
  return (
    <div className="app-page min-h-screen">
      <div className="container trips-container py-6">
        <Card className="trip-card max-w-4xl">
          <h1 className="app-title">{title}</h1>
          <p className="app-subtitle">{description}</p>

          <ul className="mt-4 pl-5 grid gap-2 text-sm text-gray-300">
            {bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>

          <div className="flex gap-2 flex-wrap mt-5">
            {actions.map((action) => (
              <Button key={action.href} asChild>
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
