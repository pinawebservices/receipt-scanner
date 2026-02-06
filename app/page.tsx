"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Users, Scissors } from "lucide-react"
import { cn } from "@/lib/utils"
import { useReceiptScanner } from "@/hooks/use-receipt-scanner"
import { ReceiptUpload } from "@/components/receipt-upload"
import { ParsedItemsList } from "@/components/parsed-items-list"
import { SplitSummary } from "@/components/split-summary"

export default function HomePage() {
  const router = useRouter()
  const [sharingSession, setSharingSession] = useState(false)

  const {
    imagePreview,
    parsedData,
    loading,
    error,
    assignments,
    priceOverrides,
    quantityOverrides,
    customItems,
    personTotals,
    allItemsAssigned,
    itemsTotal,
    itemsTotalMismatch,
    uniquePersonNames,
    handleImageSelect,
    handleScanReceipt,
    handleAssignmentChange,
    addAssignment,
    updateAssignment,
    removeAssignment,
    updateItemPrice,
    updateItemQuantity,
    addCustomItem,
    updateCustomItem,
    removeCustomItem,
    calculateTotals,
    getItemPrice,
    getItemQuantity,
  } = useReceiptScanner()

  const handleShareWithGroup = async () => {
    if (!parsedData || itemsTotalMismatch) return

    setSharingSession(true)
    try {
      const res = await fetch("/api/session/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receipt: parsedData,
          customItems,
          priceOverrides,
          quantityOverrides,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        console.error("Failed to create session:", data.error)
        setSharingSession(false)
        return
      }
      localStorage.setItem("split_session", data.sessionId)
      router.push(`/session/${data.sessionId}`)
    } catch (err) {
      console.error("Failed to create session:", err)
      setSharingSession(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-8 pt-12">
      {/* Header */}
      <header className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Scissors className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">
          Split
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Split bills with friends, effortlessly
        </p>
      </header>

      {/* Upload section */}
      <ReceiptUpload
        imagePreview={imagePreview}
        loading={loading}
        onImageSelect={handleImageSelect}
        onScanReceipt={handleScanReceipt}
      />

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Parsed data */}
      {parsedData && (
        <div className="mt-6 flex flex-col gap-6">
          {/* Share with group CTA */}
          <button
            type="button"
            onClick={handleShareWithGroup}
            disabled={itemsTotalMismatch || sharingSession}
            className={cn(
              "flex items-center justify-center gap-2 rounded-2xl",
              "bg-primary px-6 py-4 text-base font-semibold text-primary-foreground",
              "transition-all active:scale-[0.98] shadow-sm",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "min-h-[56px]"
            )}
          >
            {sharingSession ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating session...
              </>
            ) : (
              <>
                <Users className="h-5 w-5" />
                Split with friends
              </>
            )}
          </button>
          {itemsTotalMismatch && (
            <p className="text-center text-xs text-muted-foreground -mt-4">
              Fix item totals to enable group sharing
            </p>
          )}

          {/* Items list */}
          <ParsedItemsList
            parsedData={parsedData}
            assignments={assignments}
            priceOverrides={priceOverrides}
            quantityOverrides={quantityOverrides}
            customItems={customItems}
            itemsTotal={itemsTotal}
            itemsTotalMismatch={itemsTotalMismatch}
            uniquePersonNames={uniquePersonNames}
            getItemPrice={getItemPrice}
            getItemQuantity={getItemQuantity}
            onAssignmentChange={handleAssignmentChange}
            onAddAssignment={addAssignment}
            onUpdateAssignment={updateAssignment}
            onRemoveAssignment={removeAssignment}
            onUpdateItemPrice={updateItemPrice}
            onUpdateItemQuantity={updateItemQuantity}
            onAddCustomItem={addCustomItem}
            onUpdateCustomItem={updateCustomItem}
            onRemoveCustomItem={removeCustomItem}
          />

          {/* Solo calculate */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={calculateTotals}
              disabled={!allItemsAssigned}
              className={cn(
                "flex items-center justify-center gap-2 rounded-2xl",
                "bg-success px-6 py-4 text-base font-semibold text-success-foreground",
                "transition-all active:scale-[0.98] shadow-sm",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "min-h-[56px]"
              )}
            >
              Calculate Totals
            </button>
            {!allItemsAssigned && (
              <p className="text-center text-xs text-muted-foreground">
                Assign all items to a person to calculate
              </p>
            )}
          </div>

          {/* Results */}
          {personTotals && personTotals.length > 0 && (
            <SplitSummary personTotals={personTotals} />
          )}
        </div>
      )}

      {/* Empty state note */}
      {!parsedData && !loading && !error && (
        <p className="mt-6 text-center text-xs text-muted-foreground leading-relaxed">
          Tip: Make sure the receipt image is clear, vertically aligned, and
          all items and totals are visible for best accuracy.
        </p>
      )}
    </main>
  )
}
