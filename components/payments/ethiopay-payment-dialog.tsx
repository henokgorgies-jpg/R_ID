"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export type EthioPayCardDetails = {
  cardNumber: string
  expiryDate: string
  cvv: string
  cardholderName?: string
}

type EthioPayPaymentDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  amountEtb: number
  title: string
  description: string
  submitLabel: string
  isSubmitting?: boolean
  onSubmit: (details: EthioPayCardDetails) => Promise<void> | void
}

export function EthioPayPaymentDialog({
  open,
  onOpenChange,
  amountEtb,
  title,
  description,
  submitLabel,
  isSubmitting = false,
  onSubmit,
}: EthioPayPaymentDialogProps) {
  const [cardNumber, setCardNumber] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [cvv, setCvv] = useState("")
  const [cardholderName, setCardholderName] = useState("")

  useEffect(() => {
    if (!open) {
      setCardNumber("")
      setExpiryDate("")
      setCvv("")
      setCardholderName("")
    }
  }, [open])

  const canSubmit = useMemo(
    () => cardNumber.trim().length > 0 && expiryDate.trim().length > 0 && cvv.trim().length > 0 && !isSubmitting,
    [cardNumber, expiryDate, cvv, isSubmitting],
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return
    await onSubmit({
      cardNumber: cardNumber.trim().replace(/\s+/g, ""),
      expiryDate: expiryDate.trim(),
      cvv: cvv.trim(),
      cardholderName: cardholderName.trim() || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
          <div className="rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-sm">
            Amount: <span className="font-semibold">{amountEtb} ETB</span>
          </div>
          <Input
            placeholder="Card number"
            value={cardNumber}
            onChange={(event) => setCardNumber(event.target.value)}
            autoComplete="cc-number"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Expiry (MM/YY)"
              value={expiryDate}
              onChange={(event) => setExpiryDate(event.target.value)}
              autoComplete="cc-exp"
            />
            <Input
              placeholder="CVV"
              value={cvv}
              onChange={(event) => setCvv(event.target.value)}
              autoComplete="cc-csc"
            />
          </div>
          <Input
            placeholder="Cardholder name (optional)"
            value={cardholderName}
            onChange={(event) => setCardholderName(event.target.value)}
            autoComplete="cc-name"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? "Processing..." : submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
