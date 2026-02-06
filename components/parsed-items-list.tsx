"use client"

import { useState } from "react"
import { AlertTriangle, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  ParsedReceipt,
  ItemAssignments,
  ItemAssignment,
  CustomItem,
} from "@/types/receipt"

interface ParsedItemsListProps {
  parsedData: ParsedReceipt
  assignments: ItemAssignments
  priceOverrides: Record<number, number>
  quantityOverrides: Record<number, number>
  customItems: CustomItem[]
  itemsTotal: number
  itemsTotalMismatch: boolean
  uniquePersonNames: string[]
  getItemPrice: (index: number) => number
  getItemQuantity: (index: number) => number
  onAssignmentChange: (itemIndex: number | string, name: string) => void
  onAddAssignment: (itemIndex: number | string) => void
  onUpdateAssignment: (itemIndex: number | string, assignmentIndex: number, updates: Partial<ItemAssignment>) => void
  onRemoveAssignment: (itemIndex: number | string, assignmentIndex: number) => void
  onUpdateItemPrice: (itemIndex: number, price: number) => void
  onUpdateItemQuantity: (itemIndex: number, quantity: number) => void
  onAddCustomItem: () => void
  onUpdateCustomItem: (id: string, updates: Partial<CustomItem>) => void
  onRemoveCustomItem: (id: string) => void
}

function ItemCard({
  name,
  price,
  quantity,
  itemKey,
  assignments,
  uniquePersonNames,
  isCustom = false,
  onAssignmentChange,
  onAddAssignment,
  onUpdateAssignment,
  onRemoveAssignment,
  onPriceChange,
  onQuantityChange,
  onRemove,
}: {
  name: string
  price: number
  quantity: number
  itemKey: number | string
  assignments: ItemAssignment[]
  uniquePersonNames: string[]
  isCustom?: boolean
  onAssignmentChange: (name: string) => void
  onAddAssignment: () => void
  onUpdateAssignment: (idx: number, updates: Partial<ItemAssignment>) => void
  onRemoveAssignment: (idx: number) => void
  onPriceChange?: (price: number) => void
  onQuantityChange?: (qty: number) => void
  onRemove?: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isMulti = quantity > 1
  const assignedQty = assignments.reduce((sum, a) => sum + a.quantity, 0)
  const remainingQty = quantity - assignedQty

  return (
    <div
      className={cn(
        "rounded-xl bg-card p-4 transition-all",
        "border border-border",
        isCustom && "border-success/30 bg-success/5"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {isCustom && onPriceChange && onQuantityChange ? (
            <input
              type="text"
              placeholder="Item name"
              value={name}
              onChange={(e) => {
                // Custom items have an id in the itemKey like "custom_123"
                // The parent handles updating via onRemove's sibling
              }}
              className={cn(
                "w-full rounded-lg border border-input bg-background px-3 py-2",
                "text-sm font-semibold text-foreground placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring"
              )}
            />
          ) : (
            <p className="text-sm font-semibold text-foreground leading-tight text-balance">
              {name}
            </p>
          )}
          <div className="mt-1.5 flex items-center gap-3">
            <span className="flex items-center gap-0.5 text-sm text-muted-foreground">
              {"$"}
              {onPriceChange ? (
                <input
                  type="text"
                  inputMode="decimal"
                  defaultValue={price.toFixed(2)}
                  onBlur={(e) => {
                    const val = parseFloat(e.target.value)
                    if (!isNaN(val) && val >= 0) onPriceChange(val)
                  }}
                  className={cn(
                    "w-16 rounded-md border border-input bg-background px-2 py-1",
                    "text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  )}
                />
              ) : (
                <span className="text-foreground">{price.toFixed(2)}</span>
              )}
            </span>
            {quantity > 1 && (
              <span className="flex items-center gap-0.5 text-sm text-muted-foreground">
                {"x"}
                {onQuantityChange ? (
                  <input
                    type="text"
                    inputMode="numeric"
                    defaultValue={quantity}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value)
                      if (!isNaN(val) && val > 0) onQuantityChange(val)
                    }}
                    className={cn(
                      "w-10 rounded-md border border-input bg-background px-2 py-1",
                      "text-center text-sm text-foreground",
                      "focus:outline-none focus:ring-2 focus:ring-ring"
                    )}
                  />
                ) : (
                  <span className="text-foreground">{quantity}</span>
                )}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isMulti ? (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className={cn(
                "flex items-center gap-1 rounded-lg px-3 py-2",
                "text-xs font-medium transition-colors",
                "bg-secondary text-secondary-foreground",
                "hover:bg-accent min-h-[44px]"
              )}
            >
              Split
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          ) : (
            <input
              type="text"
              placeholder="Who?"
              list="person-names"
              value={assignments[0]?.name || ""}
              onChange={(e) => onAssignmentChange(e.target.value)}
              className={cn(
                "w-28 rounded-lg border border-input bg-background px-3 py-2",
                "text-sm text-foreground placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]"
              )}
            />
          )}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
              aria-label="Remove item"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {isMulti && expanded && (
        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
          {assignments.map((assignment, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Name"
                list="person-names"
                value={assignment.name}
                onChange={(e) => onUpdateAssignment(idx, { name: e.target.value })}
                className={cn(
                  "flex-1 rounded-lg border border-input bg-background px-3 py-2",
                  "text-sm text-foreground min-h-[44px]",
                  "focus:outline-none focus:ring-2 focus:ring-ring"
                )}
              />
              <span className="text-xs text-muted-foreground">x</span>
              <input
                type="text"
                inputMode="numeric"
                value={assignment.quantity || ""}
                onChange={(e) => {
                  const val = e.target.value === "" ? 0 : parseInt(e.target.value)
                  if (!isNaN(val)) onUpdateAssignment(idx, { quantity: val })
                }}
                className={cn(
                  "w-12 rounded-lg border border-input bg-background px-2 py-2",
                  "text-center text-sm text-foreground min-h-[44px]",
                  "focus:outline-none focus:ring-2 focus:ring-ring"
                )}
              />
              <button
                type="button"
                onClick={() => onRemoveAssignment(idx)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                aria-label="Remove person"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onAddAssignment}
              disabled={remainingQty <= 0}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2",
                "text-xs font-medium text-primary",
                "hover:bg-primary/10 transition-colors min-h-[44px]",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              Add person
            </button>
            <span
              className={cn(
                "text-xs",
                remainingQty > 0 && "text-muted-foreground",
                remainingQty === 0 && "text-success font-medium",
                remainingQty < 0 && "text-destructive font-medium"
              )}
            >
              {remainingQty > 0
                ? `${remainingQty} of ${quantity} left`
                : remainingQty < 0
                  ? `Over by ${Math.abs(remainingQty)}`
                  : "All assigned"}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export function ParsedItemsList({
  parsedData,
  assignments,
  customItems,
  itemsTotal,
  itemsTotalMismatch,
  uniquePersonNames,
  getItemPrice,
  getItemQuantity,
  onAssignmentChange,
  onAddAssignment,
  onUpdateAssignment,
  onRemoveAssignment,
  onUpdateItemPrice,
  onUpdateItemQuantity,
  onAddCustomItem,
  onUpdateCustomItem,
  onRemoveCustomItem,
}: ParsedItemsListProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Person name datalist for autocomplete */}
      <datalist id="person-names">
        {uniquePersonNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {/* Mismatch warning */}
      {itemsTotalMismatch && (
        <div className="flex items-start gap-3 rounded-xl bg-chart-4/10 border border-chart-4/30 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-chart-4 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">
              Total mismatch
            </span>
            <span className="text-xs text-muted-foreground">
              Items total (${itemsTotal.toFixed(2)}) doesn{"'"}t match subtotal ($
              {parsedData.subtotal?.toFixed(2)}). Correct the prices or quantities below.
            </span>
          </div>
        </div>
      )}

      {/* Restaurant name */}
      {parsedData.restaurant_name && (
        <p className="text-center text-sm font-medium text-muted-foreground">
          {parsedData.restaurant_name}
        </p>
      )}

      {/* Items */}
      <div className="flex flex-col gap-2">
        {parsedData.items.map((item, index) => (
          <ItemCard
            key={index}
            name={item.name}
            price={getItemPrice(index)}
            quantity={getItemQuantity(index)}
            itemKey={index}
            assignments={assignments[index] || []}
            uniquePersonNames={uniquePersonNames}
            onAssignmentChange={(name) => onAssignmentChange(index, name)}
            onAddAssignment={() => onAddAssignment(index)}
            onUpdateAssignment={(idx, updates) => onUpdateAssignment(index, idx, updates)}
            onRemoveAssignment={(idx) => onRemoveAssignment(index, idx)}
            onPriceChange={(price) => onUpdateItemPrice(index, price)}
            onQuantityChange={(qty) => onUpdateItemQuantity(index, qty)}
          />
        ))}

        {/* Custom items */}
        {customItems.map((item) => {
          const itemKey = `custom_${item.id}`
          return (
            <ItemCard
              key={item.id}
              name={item.name}
              price={item.price}
              quantity={item.quantity}
              itemKey={itemKey}
              assignments={assignments[itemKey] || []}
              uniquePersonNames={uniquePersonNames}
              isCustom
              onAssignmentChange={(name) => onAssignmentChange(itemKey, name)}
              onAddAssignment={() => onAddAssignment(itemKey)}
              onUpdateAssignment={(idx, updates) => onUpdateAssignment(itemKey, idx, updates)}
              onRemoveAssignment={(idx) => onRemoveAssignment(itemKey, idx)}
              onPriceChange={(price) => onUpdateCustomItem(item.id, { price })}
              onQuantityChange={(qty) => onUpdateCustomItem(item.id, { quantity: qty })}
              onRemove={() => onRemoveCustomItem(item.id)}
            />
          )
        })}
      </div>

      {/* Add item button */}
      <button
        type="button"
        onClick={onAddCustomItem}
        className={cn(
          "flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border",
          "bg-card/50 px-4 py-3 text-sm font-medium text-muted-foreground",
          "transition-colors hover:border-primary/30 hover:text-foreground",
          "min-h-[48px]"
        )}
      >
        <Plus className="h-4 w-4" />
        Add missing item
      </button>

      {/* Totals */}
      <div className="rounded-xl bg-secondary/50 p-4">
        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground">${parsedData.subtotal?.toFixed(2) || "N/A"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Tax
              {parsedData.tax != null && parsedData.subtotal != null && parsedData.subtotal > 0 && (
                <span className="ml-1 text-xs">
                  ({((parsedData.tax / parsedData.subtotal) * 100).toFixed(1)}%)
                </span>
              )}
            </span>
            <span className="text-foreground">${parsedData.tax?.toFixed(2) || "N/A"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Tip
              {parsedData.tip != null && parsedData.subtotal != null && parsedData.subtotal > 0 && (
                <span className="ml-1 text-xs">
                  ({((parsedData.tip / parsedData.subtotal) * 100).toFixed(1)}%)
                </span>
              )}
            </span>
            <span className="text-foreground">${parsedData.tip?.toFixed(2) || "N/A"}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-border pt-2">
            <span className="font-semibold text-foreground">Total</span>
            <span className="font-semibold text-foreground">
              ${parsedData.total?.toFixed(2) || "N/A"}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
