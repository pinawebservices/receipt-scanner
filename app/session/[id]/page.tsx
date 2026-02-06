"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Loader2,
  Copy,
  Check,
  Minus,
  Plus,
  Calculator,
  Users,
  ArrowLeft,
  Scissors,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Session, PersonTotal } from "@/types/receipt"

interface SessionData {
  session: Session
  allItemsClaimed: boolean
}

export default function SessionPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [copied, setCopied] = useState(false)

  const fetchSession = useCallback(async () => {
    if (!id) return
    try {
      const res = await fetch(`/api/session/${id}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to load session")
        return
      }
      setSessionData(data)
      setError(null)
    } catch {
      setError("Failed to load session")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (!id) return
    const init = async () => {
      const savedName = localStorage.getItem("split_name")
      const savedSession = localStorage.getItem("split_session")
      if (savedName && savedSession === id) {
        setCurrentUser(savedName)
        try {
          await fetch(`/api/session/${id}/join`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: savedName }),
          })
        } catch {
          // Already joined
        }
      }
      fetchSession()
    }
    init()
  }, [id, fetchSession])

  useEffect(() => {
    if (!id || !currentUser) return
    const interval = setInterval(fetchSession, 3000)
    return () => clearInterval(interval)
  }, [id, currentUser, fetchSession])

  const handleJoin = async () => {
    if (!nameInput.trim() || !id) return
    setJoining(true)
    setError(null)
    try {
      const res = await fetch(`/api/session/${id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to join session")
        return
      }
      localStorage.setItem("split_name", nameInput.trim())
      localStorage.setItem("split_session", id)
      setCurrentUser(nameInput.trim())
      fetchSession()
    } catch {
      setError("Failed to join session")
    } finally {
      setJoining(false)
    }
  }

  const handleClaim = async (itemKey: string, quantity: number) => {
    if (!currentUser || !id) return
    setClaimError(null)
    try {
      const res = await fetch(`/api/session/${id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemKey, personName: currentUser, quantity }),
      })
      const data = await res.json()
      if (!res.ok) {
        setClaimError(
          data.claimedBy
            ? `Already claimed by ${data.claimedBy}`
            : data.error || "Failed to claim item"
        )
        fetchSession()
        return
      }
      fetchSession()
    } catch {
      setClaimError("Failed to claim item")
    }
  }

  const handleCalculate = async () => {
    if (!id) return
    setCalculating(true)
    try {
      const res = await fetch(`/api/session/${id}/calculate`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to calculate split")
        return
      }
      fetchSession()
    } catch {
      setError("Failed to calculate split")
    } finally {
      setCalculating(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getItemQuantity = (session: Session, index: number): number => {
    if (session.quantityOverrides[index] !== undefined)
      return session.quantityOverrides[index]
    return session.receipt.items[index]?.quantity || 1
  }

  const getItemPrice = (session: Session, index: number): number => {
    if (session.priceOverrides[index] !== undefined)
      return session.priceOverrides[index]
    return session.receipt.items[index]?.price || 0
  }

  const getUserClaim = (itemKey: string): number => {
    if (!sessionData || !currentUser) return 0
    const claims = sessionData.session.claims[itemKey] || []
    return claims.find((c) => c.personName === currentUser)?.quantity || 0
  }

  const getTotalClaimed = (itemKey: string): number => {
    if (!sessionData) return 0
    const claims = sessionData.session.claims[itemKey] || []
    return claims.reduce((sum, c) => sum + c.quantity, 0)
  }

  const getClaimers = (itemKey: string): Array<{ name: string; qty: number }> => {
    if (!sessionData) return []
    const claims = sessionData.session.claims[itemKey] || []
    return claims.map((c) => ({ name: c.personName, qty: c.quantity }))
  }

  // Calculate current user's running total
  const userRunningTotal = (() => {
    if (!sessionData || !currentUser) return 0
    const session = sessionData.session
    let total = 0

    session.receipt.items.forEach((_, index) => {
      const itemKey = String(index)
      const claims = session.claims[itemKey] || []
      const userClaim = claims.find((c) => c.personName === currentUser)
      if (userClaim) {
        const price = getItemPrice(session, index)
        const qty = getItemQuantity(session, index)
        const pricePerUnit = qty > 0 ? price / qty : 0
        total += pricePerUnit * userClaim.quantity
      }
    })

    session.customItems.forEach((item) => {
      const itemKey = `custom_${item.id}`
      const claims = session.claims[itemKey] || []
      const userClaim = claims.find((c) => c.personName === currentUser)
      if (userClaim) {
        const pricePerUnit = item.quantity > 0 ? item.price / item.quantity : 0
        total += pricePerUnit * userClaim.quantity
      }
    })

    // Add proportional tax and tip
    const subtotal = session.receipt.subtotal || 0
    if (subtotal > 0) {
      const taxRate = session.receipt.tax != null ? session.receipt.tax / subtotal : 0
      const tipRate = session.receipt.tip != null ? session.receipt.tip / subtotal : 0
      total += total * taxRate + total * tipRate
    }

    return total
  })()

  // Loading state
  if (loading) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Loading session...</p>
      </main>
    )
  }

  // Error state
  if (error && !sessionData) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 gap-4">
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-5 py-3",
            "text-sm font-medium text-primary",
            "hover:bg-primary/10 transition-colors"
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          Go home
        </button>
      </main>
    )
  }

  // Join flow
  if (!currentUser) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-8 pt-12">
        <header className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Scissors className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Join the split
          </h1>
          {sessionData?.session.receipt.restaurant_name && (
            <p className="mt-1 text-sm text-muted-foreground">
              {sessionData.session.receipt.restaurant_name}
            </p>
          )}
        </header>

        <div className="flex flex-col gap-4 rounded-2xl bg-card border border-border p-6">
          <p className="text-sm text-muted-foreground text-center">
            Enter your first name to claim your items
          </p>
          <input
            type="text"
            placeholder="Your name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            autoFocus
            className={cn(
              "rounded-xl border border-input bg-background px-4 py-3.5",
              "text-base text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring",
              "min-h-[52px]"
            )}
          />
          <button
            type="button"
            onClick={handleJoin}
            disabled={!nameInput.trim() || joining}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl",
              "bg-primary px-6 py-3.5 text-base font-semibold text-primary-foreground",
              "transition-all active:scale-[0.98]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "min-h-[52px]"
            )}
          >
            {joining ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Joining...
              </>
            ) : (
              "Join Session"
            )}
          </button>
          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}
        </div>
      </main>
    )
  }

  const session = sessionData!.session
  const allItemsClaimed = sessionData!.allItemsClaimed

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-28 pt-8">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground text-balance">
          {session.receipt.restaurant_name || "Split Session"}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Hi, {currentUser}
        </p>
      </header>

      {/* Share link */}
      <div className="mb-4 rounded-xl bg-primary/5 border border-primary/20 p-4">
        <p className="mb-2.5 text-xs font-medium text-primary">
          Share with your group
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={typeof window !== "undefined" ? window.location.href : ""}
            className={cn(
              "flex-1 truncate rounded-lg border border-input bg-background px-3 py-2",
              "text-xs text-foreground"
            )}
          />
          <button
            type="button"
            onClick={copyLink}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2",
              "text-xs font-medium transition-colors min-h-[40px]",
              copied
                ? "bg-success text-success-foreground"
                : "bg-primary text-primary-foreground"
            )}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Participants */}
      <div className="mb-4 flex items-center gap-2 rounded-xl bg-secondary/50 px-4 py-3">
        <Users className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex flex-wrap gap-1.5">
          {session.participants.length > 0 ? (
            session.participants.map((name) => (
              <span
                key={name}
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5",
                  "text-xs font-medium",
                  name === currentUser
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground border border-border"
                )}
              >
                {name}
              </span>
            ))
          ) : (
            <span className="text-xs text-muted-foreground italic">
              Waiting for friends...
            </span>
          )}
        </div>
      </div>

      {/* Claim error */}
      {claimError && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 flex items-center justify-between">
          <p className="text-xs text-destructive">{claimError}</p>
          <button
            type="button"
            onClick={() => setClaimError(null)}
            className="text-xs text-destructive underline ml-2 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Items or Results */}
      {!session.isCalculated ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground mb-1">
            Tap items you ordered to claim them
          </p>

          {/* Parsed items */}
          {session.receipt.items.map((item, index) => {
            const itemKey = String(index)
            const itemQty = getItemQuantity(session, index)
            const itemPrice = getItemPrice(session, index)
            const userClaim = getUserClaim(itemKey)
            const totalClaimed = getTotalClaimed(itemKey)
            const remaining = itemQty - totalClaimed
            const claimers = getClaimers(itemKey)
            const fullyClaimedByOthers =
              remaining <= 0 && userClaim === 0

            return (
              <div
                key={index}
                className={cn(
                  "rounded-xl bg-card border border-border p-4 transition-all",
                  totalClaimed === itemQty && "opacity-70",
                  userClaim > 0 && "border-primary/40 bg-primary/5"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight text-balance">
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      ${itemPrice.toFixed(2)}
                      {itemQty > 1 && ` x${itemQty}`}
                    </p>
                    {/* Claimer pills */}
                    {claimers.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {claimers.map((c) => (
                          <span
                            key={c.name}
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5",
                              "text-[10px] font-medium",
                              c.name === currentUser
                                ? "bg-primary/20 text-primary"
                                : "bg-secondary text-secondary-foreground"
                            )}
                          >
                            {c.name}
                            {c.qty > 1 && ` x${c.qty}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Claim controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        handleClaim(itemKey, Math.max(0, userClaim - 1))
                      }
                      disabled={userClaim === 0}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl",
                        "border border-border bg-card text-foreground",
                        "transition-colors hover:bg-accent",
                        "disabled:opacity-30 disabled:cursor-not-allowed"
                      )}
                      aria-label="Decrease claim"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span
                      className={cn(
                        "min-w-[28px] text-center text-sm font-semibold",
                        userClaim > 0 ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {userClaim}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleClaim(itemKey, userClaim + 1)}
                      disabled={fullyClaimedByOthers || remaining <= 0}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl",
                        "border border-border bg-card text-foreground",
                        "transition-colors hover:bg-accent",
                        "disabled:opacity-30 disabled:cursor-not-allowed"
                      )}
                      aria-label="Increase claim"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Status */}
                <div className="mt-2 flex justify-end">
                  {totalClaimed === itemQty ? (
                    <span className="text-[10px] font-medium text-success">
                      All claimed
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">
                      {remaining} of {itemQty} left
                    </span>
                  )}
                </div>
              </div>
            )
          })}

          {/* Custom items */}
          {session.customItems.map((item) => {
            const itemKey = `custom_${item.id}`
            const userClaim = getUserClaim(itemKey)
            const totalClaimed = getTotalClaimed(itemKey)
            const remaining = item.quantity - totalClaimed
            const claimers = getClaimers(itemKey)
            const fullyClaimedByOthers =
              remaining <= 0 && userClaim === 0

            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-xl bg-card border border-success/30 p-4 transition-all",
                  totalClaimed === item.quantity && "opacity-70",
                  userClaim > 0 && "border-primary/40 bg-primary/5"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      ${item.price.toFixed(2)}
                      {item.quantity > 1 && ` x${item.quantity}`}
                    </p>
                    {claimers.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {claimers.map((c) => (
                          <span
                            key={c.name}
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5",
                              "text-[10px] font-medium",
                              c.name === currentUser
                                ? "bg-primary/20 text-primary"
                                : "bg-secondary text-secondary-foreground"
                            )}
                          >
                            {c.name}
                            {c.qty > 1 && ` x${c.qty}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        handleClaim(itemKey, Math.max(0, userClaim - 1))
                      }
                      disabled={userClaim === 0}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl",
                        "border border-border bg-card text-foreground",
                        "transition-colors hover:bg-accent",
                        "disabled:opacity-30 disabled:cursor-not-allowed"
                      )}
                      aria-label="Decrease claim"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span
                      className={cn(
                        "min-w-[28px] text-center text-sm font-semibold",
                        userClaim > 0 ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {userClaim}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleClaim(itemKey, userClaim + 1)}
                      disabled={fullyClaimedByOthers || remaining <= 0}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl",
                        "border border-border bg-card text-foreground",
                        "transition-colors hover:bg-accent",
                        "disabled:opacity-30 disabled:cursor-not-allowed"
                      )}
                      aria-label="Increase claim"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex justify-end">
                  {totalClaimed === item.quantity ? (
                    <span className="text-[10px] font-medium text-success">
                      All claimed
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">
                      {remaining} of {item.quantity} left
                    </span>
                  )}
                </div>
              </div>
            )
          })}

          {/* Totals */}
          <div className="mt-2 rounded-xl bg-secondary/50 p-4">
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">
                  ${session.receipt.subtotal?.toFixed(2) || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span className="text-foreground">
                  ${session.receipt.tax?.toFixed(2) || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tip</span>
                <span className="text-foreground">
                  ${session.receipt.tip?.toFixed(2) || "N/A"}
                </span>
              </div>
              <div className="mt-1 flex justify-between border-t border-border pt-2">
                <span className="font-semibold text-foreground">Total</span>
                <span className="font-semibold text-foreground">
                  ${session.receipt.total?.toFixed(2) || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Calculate button */}
          <div className="mt-2 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={handleCalculate}
              disabled={!allItemsClaimed || calculating}
              className={cn(
                "flex items-center justify-center gap-2 rounded-2xl",
                "bg-success px-6 py-4 text-base font-semibold text-success-foreground",
                "transition-all active:scale-[0.98] shadow-sm",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "min-h-[56px]"
              )}
            >
              {calculating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Calculator className="h-5 w-5" />
                  Calculate Split
                </>
              )}
            </button>
            {!allItemsClaimed && (
              <p className="text-center text-xs text-muted-foreground">
                All items must be claimed first
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Results */
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-foreground">
            Everyone{"'"}s share
          </h2>
          <p className="text-xs text-muted-foreground -mt-2 mb-1">
            Items are locked. Here{"'"}s what each person owes.
          </p>

          {session.splitResults?.map((person: PersonTotal) => (
            <div
              key={person.name}
              className={cn(
                "rounded-xl bg-card border border-border p-4",
                person.name === currentUser && "border-primary/40 bg-primary/5"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full",
                      "text-sm font-semibold",
                      person.name === currentUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {person.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-foreground">
                      {person.name}
                    </span>
                    {person.name === currentUser && (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        (you)
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-lg font-bold text-primary">
                  ${person.total.toFixed(2)}
                </span>
              </div>
              <div className="mt-2 flex gap-4 pl-13 text-xs text-muted-foreground">
                <span>Food ${person.subtotal.toFixed(2)}</span>
                <span>Tax ${person.tax.toFixed(2)}</span>
                <span>Tip ${person.tip.toFixed(2)}</span>
              </div>
            </div>
          ))}

          {/* Receipt totals */}
          <div className="mt-2 rounded-xl bg-secondary/50 p-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Receipt totals
            </p>
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">
                  ${session.receipt.subtotal?.toFixed(2) || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span className="text-foreground">
                  ${session.receipt.tax?.toFixed(2) || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tip</span>
                <span className="text-foreground">
                  ${session.receipt.tip?.toFixed(2) || "N/A"}
                </span>
              </div>
              <div className="mt-1 flex justify-between border-t border-border pt-2">
                <span className="font-semibold text-foreground">Total</span>
                <span className="font-semibold text-foreground">
                  ${session.receipt.total?.toFixed(2) || "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && sessionData && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Floating bottom bar - running total (only during claiming) */}
      {!session.isCalculated && (
        <div className="fixed inset-x-0 bottom-0 z-50">
          <div className="mx-auto max-w-md">
            <div
              className={cn(
                "mx-3 mb-3 flex items-center justify-between rounded-2xl",
                "bg-card border border-border px-5 py-4 shadow-lg",
                "backdrop-blur-sm"
              )}
            >
              <span className="text-sm text-muted-foreground">Your total so far</span>
              <span className="text-lg font-bold text-primary">
                ${userRunningTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
