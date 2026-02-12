import { useState } from 'react';
import { track } from '@/lib/analytics';
import { ParsedReceipt, ItemAssignments, ItemAssignment, PersonTotal, CustomItem } from '@/types/receipt';

interface UseReceiptScannerReturn {
  selectedImage: File | null;
  imagePreview: string | null;
  parsedData: ParsedReceipt | null;
  loading: boolean;
  error: string | null;
  assignments: ItemAssignments;
  priceOverrides: Record<number, number>;
  quantityOverrides: Record<number, number>;
  customItems: CustomItem[];
  personTotals: PersonTotal[] | null;
  allItemsAssigned: boolean;
  itemsTotal: number;
  itemsTotalMismatch: boolean;
  uniquePersonNames: string[];
  handleImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleScanReceipt: () => Promise<void>;
  // For single-quantity items (simple case)
  handleAssignmentChange: (itemIndex: number | string, name: string) => void;
  // For multi-quantity items
  addAssignment: (itemIndex: number | string) => void;
  updateAssignment: (itemIndex: number | string, assignmentIndex: number, updates: Partial<ItemAssignment>) => void;
  removeAssignment: (itemIndex: number | string, assignmentIndex: number) => void;
  updateItemPrice: (itemIndex: number, price: number) => void;
  updateItemQuantity: (itemIndex: number, quantity: number) => void;
  addCustomItem: () => void;
  updateCustomItem: (id: string, updates: Partial<CustomItem>) => void;
  removeCustomItem: (id: string) => void;
  calculateTotals: () => void;
}

export function useReceiptScanner(): UseReceiptScannerReturn {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedReceipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<ItemAssignments>({});
  const [priceOverrides, setPriceOverrides] = useState<Record<number, number>>({});
  const [quantityOverrides, setQuantityOverrides] = useState<Record<number, number>>({});
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [personTotals, setPersonTotals] = useState<PersonTotal[] | null>(null);

  // Get the effective price for an item (override or original)
  const getItemPrice = (index: number): number => {
    if (priceOverrides[index] !== undefined) {
      return priceOverrides[index];
    }
    return parsedData?.items[index]?.price || 0;
  };

  // Get the effective quantity for an item (override or original)
  const getItemQuantity = (index: number): number => {
    if (quantityOverrides[index] !== undefined) {
      return quantityOverrides[index];
    }
    return parsedData?.items[index]?.quantity || 1;
  };

  // Calculate total of all items (parsed + custom, using overrides)
  const parsedItemsTotal = parsedData?.items.reduce(
    (sum, _, index) => sum + getItemPrice(index),
    0
  ) || 0;

  const customItemsTotal = customItems.reduce(
    (sum, item) => sum + item.price,
    0
  );

  const itemsTotal = parsedItemsTotal + customItemsTotal;

  // Check if items total matches the subtotal (within small tolerance for rounding)
  const itemsTotalMismatch = parsedData?.subtotal != null
    ? Math.abs(itemsTotal - parsedData.subtotal) > 0.01
    : false;

  // Collect unique person names from all assignments for autocomplete
  const uniquePersonNames = Array.from(
    new Set(
      Object.values(assignments)
        .flat()
        .map((a) => a.name.trim())
        .filter((name) => name !== '')
    )
  ).sort();

  // Check if all items have their quantities fully assigned
  const allItemsAssigned = (() => {
    const parsedItemCount = parsedData?.items?.length || 0;
    const totalItemCount = parsedItemCount + customItems.length;
    if (totalItemCount === 0) return false;

    // Check parsed items
    const parsedItemsOk = parsedData?.items.every((_, index) => {
      const itemAssignments = assignments[index] || [];
      const allNamed = itemAssignments.every((a) => a.name.trim() !== '');
      const totalAssigned = itemAssignments.reduce((sum, a) => sum + a.quantity, 0);
      const itemQty = getItemQuantity(index);
      return allNamed && totalAssigned === itemQty;
    }) ?? true;

    // Check custom items (use negative indices: -1, -2, etc. or use string keys)
    const customItemsOk = customItems.every((item) => {
      const itemAssignments = assignments[`custom_${item.id}`] || [];
      const allNamed = itemAssignments.every((a) => a.name.trim() !== '');
      const totalAssigned = itemAssignments.reduce((sum, a) => sum + a.quantity, 0);
      return allNamed && totalAssigned === item.quantity;
    });

    return parsedItemsOk && customItemsOk;
  })();

  // Calculate each person's totals
  const calculateTotals = () => {
    if (!allItemsAssigned) return;

    const subtotal = parsedData?.subtotal || 0;
    const taxRate = subtotal > 0 && parsedData?.tax != null ? parsedData.tax / subtotal : 0;
    const tipRate = subtotal > 0 && parsedData?.tip != null ? parsedData.tip / subtotal : 0;

    // Aggregate each person's subtotal
    const personSubtotals: Record<string, number> = {};

    // Process parsed items
    parsedData?.items.forEach((_, index) => {
      const itemAssignments = assignments[index] || [];
      const itemPrice = getItemPrice(index);
      const itemQty = getItemQuantity(index);
      const pricePerUnit = itemQty > 0 ? itemPrice / itemQty : 0;

      itemAssignments.forEach((assignment) => {
        const name = assignment.name.trim();
        if (!name) return;

        const amount = pricePerUnit * assignment.quantity;
        personSubtotals[name] = (personSubtotals[name] || 0) + amount;
      });
    });

    // Process custom items
    customItems.forEach((item) => {
      const itemAssignments = assignments[`custom_${item.id}`] || [];
      const pricePerUnit = item.quantity > 0 ? item.price / item.quantity : 0;

      itemAssignments.forEach((assignment) => {
        const name = assignment.name.trim();
        if (!name) return;

        const amount = pricePerUnit * assignment.quantity;
        personSubtotals[name] = (personSubtotals[name] || 0) + amount;
      });
    });

    // Calculate tax, tip, and total for each person
    const totals: PersonTotal[] = Object.entries(personSubtotals)
      .map(([name, personSubtotal]) => ({
        name,
        subtotal: personSubtotal,
        tax: personSubtotal * taxRate,
        tip: personSubtotal * tipRate,
        total: personSubtotal + personSubtotal * taxRate + personSubtotal * tipRate,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    setPersonTotals(totals);
    track('solo_calculated', {
      person_count: totals.length,
      total: parsedData?.total,
    });
  };

  const compressImage = (base64Image: string, maxWidth = 2000): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.src = base64Image;
    });
  };

  // For single-quantity items: just store one assignment with quantity 1
  const handleAssignmentChange = (itemIndex: number | string, name: string) => {
    setAssignments((prev) => ({
      ...prev,
      [itemIndex]: [{ name, quantity: 1 }],
    }));
  };

  // Add a new empty assignment to a multi-quantity item
  const addAssignment = (itemIndex: number | string) => {
    setAssignments((prev) => ({
      ...prev,
      [itemIndex]: [...(prev[itemIndex] || []), { name: '', quantity: 1 }],
    }));
  };

  // Update a specific assignment (name or quantity)
  const updateAssignment = (
    itemIndex: number | string,
    assignmentIndex: number,
    updates: Partial<ItemAssignment>
  ) => {
    setAssignments((prev) => {
      const itemAssignments = [...(prev[itemIndex] || [])];
      itemAssignments[assignmentIndex] = {
        ...itemAssignments[assignmentIndex],
        ...updates,
      };
      return { ...prev, [itemIndex]: itemAssignments };
    });
  };

  // Remove an assignment from a multi-quantity item
  const removeAssignment = (itemIndex: number | string, assignmentIndex: number) => {
    setAssignments((prev) => {
      const itemAssignments = (prev[itemIndex] || []).filter(
        (_, i) => i !== assignmentIndex
      );
      return { ...prev, [itemIndex]: itemAssignments };
    });
  };

  // Update the price of an item (for correcting OCR errors)
  const updateItemPrice = (itemIndex: number, price: number) => {
    setPriceOverrides((prev) => ({
      ...prev,
      [itemIndex]: price,
    }));
  };

  // Update the quantity of an item (for correcting OCR errors)
  const updateItemQuantity = (itemIndex: number, quantity: number) => {
    setQuantityOverrides((prev) => ({
      ...prev,
      [itemIndex]: quantity,
    }));
  };

  // Add a new custom item
  const addCustomItem = () => {
    const id = Date.now().toString();
    setCustomItems((prev) => [...prev, { id, name: '', price: 0, quantity: 1 }]);
  };

  // Update a custom item
  const updateCustomItem = (id: string, updates: Partial<CustomItem>) => {
    setCustomItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  // Remove a custom item
  const removeCustomItem = (id: string) => {
    setCustomItems((prev) => prev.filter((item) => item.id !== id));
    // Also remove any assignments for this item
    setAssignments((prev) => {
      const newAssignments = { ...prev };
      delete newAssignments[`custom_${id}`];
      return newAssignments;
    });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setError(null);
      setParsedData(null);

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScanReceipt = async () => {
    if (!selectedImage) return;

    setLoading(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(selectedImage);

      reader.onloadend = async () => {
        try {
          const base64Image = reader.result as string;
          const compressedImage = await compressImage(base64Image);

          const response = await fetch('/api/parse-receipt', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: compressedImage }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to parse receipt');
          }

          setParsedData(data);
          setAssignments({}); // Reset assignments for new receipt
          setPriceOverrides({}); // Reset price overrides for new receipt
          setQuantityOverrides({}); // Reset quantity overrides for new receipt
          setCustomItems([]); // Reset custom items for new receipt
          setPersonTotals(null); // Reset calculated totals
          track('receipt_scanned', {
            item_count: data.items?.length || 0,
            restaurant: data.restaurant_name || 'unknown',
            total: data.total,
          });
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'An error occurred';
          setError(errorMsg);
          track('scan_failed', { error: errorMsg });
        } finally {
          setLoading(false);
        }
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return {
    selectedImage,
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
  };
}