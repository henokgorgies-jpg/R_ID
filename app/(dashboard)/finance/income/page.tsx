"use client"

import { useEffect, useState } from "react"
import { BarChart3, ScrollText } from "lucide-react"
import { PageShell, WorkspaceCard } from "@/components/layout/page-shell"
import { OpsPageIntro } from "@/components/layout/ops-page-intro"
import { Badge } from "@/components/ui/badge"

type FinanceSummary = {
  totalIncomeEtb: number
  todayIncomeEtb: number
  monthIncomeEtb: number
  totalTransactions: number
  authorizedTransactions: number
  consumedTransactions: number
}

type FinanceTransaction = {
  id: string
  residentId: string
  timestamp: string
  amount: number
  reference: string
  phase: string
  status: string
  mode: string
  method: string
}

export default function FinanceIncomePage() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [recent, setRecent] = useState<FinanceTransaction[]>([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const res = await fetch("/api/finance/summary", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setSummary(data.summary ?? null)
        setRecent(data.recentTransactions ?? [])
      }
      setLoading(false)
    }
    void load()
  }, [])

  return (
    <PageShell title="Income" hideHeader>
      <OpsPageIntro
        eyebrow="Finance"
        title="Income Dashboard"
        description="Track collected ID issuance and reissue income from EthioPay transactions."
        links={[
          { label: "Income", href: "/finance/income", icon: BarChart3 },
          { label: "Transactions", href: "/finance/transactions", icon: ScrollText },
        ]}
      />

      {loading ? (
        <WorkspaceCard title="Loading">
          <p className="text-sm text-muted-foreground">Loading finance summary...</p>
        </WorkspaceCard>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <WorkspaceCard title="Total Income">
              <p className="text-2xl font-bold">{summary?.totalIncomeEtb?.toLocaleString() ?? 0} ETB</p>
            </WorkspaceCard>
            <WorkspaceCard title="This Month">
              <p className="text-2xl font-bold">{summary?.monthIncomeEtb?.toLocaleString() ?? 0} ETB</p>
            </WorkspaceCard>
            <WorkspaceCard title="Today">
              <p className="text-2xl font-bold">{summary?.todayIncomeEtb?.toLocaleString() ?? 0} ETB</p>
            </WorkspaceCard>
          </div>

          <WorkspaceCard title="Recent Income Transactions" description="Latest consumed payment records">
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No income transactions found.</p>
            ) : (
              <div className="space-y-2">
                {recent.map((row) => (
                  <div key={row.id} className="flex items-center justify-between border p-3">
                    <div>
                      <p className="font-medium">{row.amount.toLocaleString()} ETB</p>
                      <p className="text-xs text-muted-foreground">Ref: {row.reference}</p>
                      <p className="text-xs text-muted-foreground">{new Date(row.timestamp).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">{row.mode.replace("_", " ")}</Badge>
                      <Badge>{row.phase}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </WorkspaceCard>
        </>
      )}
    </PageShell>
  )
}
