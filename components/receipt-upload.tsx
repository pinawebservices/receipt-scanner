"use client"

import { useRef } from "react"
import { Camera, Upload, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ReceiptUploadProps {
  imagePreview: string | null
  loading: boolean
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onScanReceipt: () => void
}

export function ReceiptUpload({
  imagePreview,
  loading,
  onImageSelect,
  onScanReceipt,
}: ReceiptUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col gap-6">
      {!imagePreview ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-border",
            "bg-card p-10 transition-all active:scale-[0.98]",
            "hover:border-primary/40 hover:bg-accent/50",
            "min-h-[200px] cursor-pointer"
          )}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Camera className="h-8 w-8 text-primary" />
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-lg font-semibold text-foreground">
              Upload a receipt
            </span>
            <span className="text-sm text-muted-foreground">
              Take a photo or choose from your gallery
            </span>
          </div>
        </button>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
            <img
              src={imagePreview}
              alt="Receipt preview"
              className="w-full max-h-[360px] object-contain"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "absolute bottom-3 right-3 flex items-center gap-2 rounded-xl",
                "bg-card/90 px-3 py-2 text-xs font-medium text-foreground",
                "shadow-sm backdrop-blur-sm transition-colors hover:bg-card",
                "border border-border"
              )}
            >
              <Upload className="h-3.5 w-3.5" />
              Change
            </button>
          </div>

          <button
            type="button"
            onClick={onScanReceipt}
            disabled={loading}
            className={cn(
              "flex items-center justify-center gap-2 rounded-2xl bg-primary",
              "px-6 py-4 text-base font-semibold text-primary-foreground",
              "transition-all active:scale-[0.98]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "min-h-[56px] shadow-sm"
            )}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Scanning...
              </>
            ) : (
              "Scan Receipt"
            )}
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onImageSelect}
        className="sr-only"
        aria-label="Upload receipt image"
      />
    </div>
  )
}
