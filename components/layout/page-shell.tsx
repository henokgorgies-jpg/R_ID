import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface PageShellProps {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  hideHeader?: boolean
}

export function PageShell({ title, description, actions, children, className, hideHeader = false }: PageShellProps) {
  return (
    <div className={cn("space-y-6 md:space-y-7", className)}>
      {!hideHeader && (
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl">{title}</h1>
            {description && <p className="text-sm text-muted-foreground md:text-base">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

interface WorkspaceCardProps {
  title: string
  description?: string
  toolbar?: ReactNode
  children: ReactNode
}

export function WorkspaceCard({ title, description, toolbar, children }: WorkspaceCardProps) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-[0_14px_35px_-24px_hsl(var(--foreground)/0.45)] backdrop-blur-sm md:p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-[-0.02em]">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {toolbar}
      </div>
      {children}
    </div>
  )
}
