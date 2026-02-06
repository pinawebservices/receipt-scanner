"use client"

import { useState, useCallback } from "react"
import type {
  ParsedReceipt,
  ItemAssignments,
  ItemAssignment,
  PersonTotal,
  CustomItem,
} from "@/types/receipt"

export function useReceiptScanner() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [parsedData, setParsedData] = useState<ParsedReceipt | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<ItemAssignments>({})
  const [priceOverrides, setPriceOverrides] = useState<Record<number, number>>({})
  const [quantityOverrides, setQuantityOverrides] = useState<Record<number, number>>({})
  const [customItems, setCustomItems] = useState<CustomItem[]>([])
  const [personTotals, setPersonTotals] = useState<PersonTotal[] | null>(null)

  const getItemPrice = useCallback(
    (index: number): number => {
      if (priceOverrides[index] !== undefined) return priceOverrides[index]
      return parsedData?.items[index]?.price || 0
    },
    [priceOverrides, parsedData]
  )

  const getItemQuantity = useCallback(
    (index: number): number => {
      if (quantityOverrides[index] !== undefined) return quantityOverrides[index]
      return parsedData?.items[index]?.quantity || 1
    },
    [quantityOverrides, parsedData]
  )

  const parsedItemsTotal =
    parsedData?.items.reduce((sum, _, index) => sum + getItemPrice(index), 0) || 0
  const customItemsTotal = customItems.reduce((sum, item) => sum + item.price, 0)
  const itemsTotal = parsedItemsTotal + customItemsTotal

  const itemsTotalMismatch =
    parsedData?.subtotal != null ? Math.abs(itemsTotal - parsedData.subtotal) > 0.01 : false

  const uniquePersonNames = Array.from(
    new Set(
      Object.values(assignments)
        .flat()
        .map((a) => a.name.trim())
        .filter((name) => name !== "")
    )
  ).sort()

  const allItemsAssigned = (() => {
    const parsedItemCount = parsedData?.items?.length || 0
    const totalItemCount = parsedItemCount + customItems.length
    if (totalItemCount === 0) return false

    const parsedOk =
      parsedData?.items.every((_, index) => {
        const itemAssignments = assignments[index] || []
        const allNamed = itemAssignments.every((a) => a.name.trim() !== "")
        const totalAssigned = itemAssignments.reduce((sum, a) => sum + a.quantity, 0)
        return allNamed && totalAssigned === getItemQuantity(index)
      }) ?? true

    const customOk = customItems.every((item) => {
      const itemAssignments = assignments[`custom_${item.id}`] || []
      const allNamed = itemAssignments.every((a) => a.name.trim() !== "")
      const totalAssigned = itemAssignments.reduce((sum, a) => sum + a.quantity, 0)
      return allNamed && totalAssigned === item.quantity
    })

    return parsedOk && customOk
  })()

  const calculateTotals = useCallback(() => {
    if (!parsedData) return

    const subtotal = parsedData.subtotal || 0
    const taxRate = subtotal > 0 && parsedData.tax != null ? parsedData.tax / subtotal : 0
    const tipRate = subtotal > 0 && parsedData.tip != null ? parsedData.tip / subtotal : 0

    const personSubtotals: Record<string, number> = {}

    parsedData.items.forEach((_, index) => {
      const itemAssignments = assignments[index] || []
      const itemPrice = getItemPrice(index)
      const itemQty = getItemQuantity(index)
      const pricePerUnit = itemQty > 0 ? itemPrice / itemQty : 0

      itemAssignments.forEach((assignment) => {
        const name = assignment.name.trim()
        if (!name) return
        personSubtotals[name] = (personSubtotals[name] || 0) + pricePerUnit * assignment.quantity
      })
    })

    customItems.forEach((item) => {
      const itemAssignments = assignments[`custom_${item.id}`] || []
      const pricePerUnit = item.quantity > 0 ? item.price / item.quantity : 0

      itemAssignments.forEach((assignment) => {
        const name = assignment.name.trim()
        if (!name) return
        personSubtotals[name] = (personSubtotals[name] || 0) + pricePerUnit * assignment.quantity
      })
    })

    const totals: PersonTotal[] = Object.entries(personSubtotals)
      .map(([name, personSubtotal]) => ({
        name,
        subtotal: personSubtotal,
        tax: personSubtotal * taxRate,
        tip: personSubtotal * tipRate,
        total: personSubtotal + personSubtotal * taxRate + personSubtotal * tipRate,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    setPersonTotals(totals)
  }, [parsedData, assignments, customItems, getItemPrice, getItemQuantity])

  const compressImage = (base64Image: string, maxWidth = 2000): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        const canvas = document.createElement("canvas")
        let width = img.width
        let height = img.height
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        ctx?.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL("image/jpeg", 0.9))
      }
      img.src = base64Image
    })
  }

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      setError(null)
      setParsedData(null)
      setPersonTotals(null)
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }, [])

  const handleScanReceipt = useCallback(async () => {
    if (!selectedImage) return
    setLoading(true)
    setError(null)

    try {
      const reader = new FileReader()
      reader.readAsDataURL(selectedImage)
      reader.onloadend = async () => {
        try {
          const base64Image = reader.result as string
          const compressedImage = await compressImage(base64Image)
          const response = await fetch("/api/parse-receipt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: compressedImage }),
          })
          const data = await response.json()
          if (!response.ok) throw new Error(data.error || "Failed to parse receipt")
          setParsedData(data)
          setAssignments({})
          setPriceOverrides({})
          setQuantityOverrides({})
          setCustomItems([])
          setPersonTotals(null)
        } catch (err) {
          setError(err instanceof Error ? err.message : "An error occurred")
        } finally {
          setLoading(false)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setLoading(false)
    }
  }, [selectedImage])

  const handleAssignmentChange = useCallback(
    (itemIndex: number | string, name: string) => {
      setAssignments((prev) => ({
        ...prev,
        [itemIndex]: [{ name, quantity: 1 }],
      }))
    },
    []
  )

  const addAssignment = useCallback((itemIndex: number | string) => {
    setAssignments((prev) => ({
      ...prev,
      [itemIndex]: [...(prev[itemIndex] || []), { name: "", quantity: 1 }],
    }))
  }, [])

  const updateAssignment = useCallback(
    (itemIndex: number | string, assignmentIndex: number, updates: Partial<ItemAssignment>) => {
      setAssignments((prev) => {
        const itemAssignments = [...(prev[itemIndex] || [])]
        itemAssignments[assignmentIndex] = { ...itemAssignments[assignmentIndex], ...updates }
        return { ...prev, [itemIndex]: itemAssignments }
      })
    },
    []
  )

  const removeAssignment = useCallback(
    (itemIndex: number | string, assignmentIndex: number) => {
      setAssignments((prev) => {
        const filtered = (prev[itemIndex] || []).filter((_, i) => i !== assignmentIndex)
        return { ...prev, [itemIndex]: filtered }
      })
    },
    []
  )

  const updateItemPrice = useCallback((itemIndex: number, price: number) => {
    setPriceOverrides((prev) => ({ ...prev, [itemIndex]: price }))
  }, [])

  const updateItemQuantity = useCallback((itemIndex: number, quantity: number) => {
    setQuantityOverrides((prev) => ({ ...prev, [itemIndex]: quantity }))
  }, [])

  const addCustomItem = useCallback(() => {
    const id = Date.now().toString()
    setCustomItems((prev) => [...prev, { id, name: "", price: 0, quantity: 1 }])
  }, [])

  const updateCustomItem = useCallback((id: string, updates: Partial<CustomItem>) => {
    setCustomItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)))
  }, [])

  const removeCustomItem = useCallback((id: string) => {
    setCustomItems((prev) => prev.filter((item) => item.id !== id))
    setAssignments((prev) => {
      const next = { ...prev }
      delete next[`custom_${id}`]
      return next
    })
  }, [])

  return {
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
  }
}
