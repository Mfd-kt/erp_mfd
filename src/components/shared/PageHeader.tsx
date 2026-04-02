import { Button } from '@/components/ui/button'
import { HeroPageHeader } from '@/components/layout/HeroPageHeader'
import { Plus } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  /** Only rendered when canManage is true */
  action?: {
    label: string
    onClick: () => void
  }
  canManage: boolean
}

export function PageHeader({ title, subtitle, action, canManage }: PageHeaderProps) {
  return (
    <HeroPageHeader
      title={title}
      subtitle={subtitle}
      rightSlot={
        canManage && action ? (
          <Button onClick={action.onClick} size="sm" className="gap-2 bg-white text-zinc-950 hover:bg-zinc-200">
            <Plus size={14} />
            {action.label}
          </Button>
        ) : undefined
      }
    />
  )
}
