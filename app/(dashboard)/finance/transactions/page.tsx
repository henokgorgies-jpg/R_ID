"use client"

import { useEffect, useState } from "react"
import { BarChart3, ScrollText } from "lucide-react"
import { PageShell, WorkspaceCard } from "@/components/layout/page-shell"
import { OpsPageIntro } from "@/components/layout/ops-page-intro"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type TransactionRow = {
  id: string
  residentId: string
  timestamp: string
  amount: number
  currency: string
  method: string
  reference: string
  status: string
  phase: string
  mode: string
}

export default function FinanceTransactionsPage() {
  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState<"all" | "authorized" | "consumed">("all")
  const [rows, setRows] = useState<TransactionRow[]>([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const res = await fetch(`/api/finance/transactions?phase=${phase}&page=1&pageSize=50`, { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setRows(data.transactions ?? [])
      }
      setLoading(false)
    }
    void load()
  }, [phase])

  return (
    <PageShell title="Transactions" hideHeader>
      <OpsPageIntro
        eyebrow="Finance"
        title="Payment Transactions"
        description="Review authorized and consumed EthioPay payment transactions for ID services."
        links={[
          { label: "Income", href: "/finance/income", icon: BarChart3 },
          { label: "Transactions", href: "/finance/transactions", icon: ScrollText },
        ]}
      />

      <div className="flex flex-wrap gap-2">
        <Button variant={phase === "all" ? "default" : "outline"} onClick={() => setPhase("all")}>All</Button>
        <Button variant={phase === "authorized" ? "default" : "outline"} onClick={() => setPhase("authorized")}>Authorized</Button>
        <Button variant={phase === "consumed" ? "default" : "outline"} onClick={() => setPhase("consumed")}>Consumed</Button>
      </div>

      <WorkspaceCard title="Transactions List">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading transactions...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions found for the selected filter.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.id} className="flex items-center justify-between border p-3">
                <div>
                  <p className="font-medium">{row.amount.toLocaleString()} {row.currency}</p>
                  <p className="text-xs text-muted-foreground">Ref: {row.reference}</p>
                  <p className="text-xs text-muted-foreground">Resident: {row.residentId}</p>
                  <p className="text-xs text-muted-foreground">{new Date(row.timestamp).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{row.status}</Badge>
                  <Badge>{row.phase}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </WorkspaceCard>
    </PageShell>
  )
}
