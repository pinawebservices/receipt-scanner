import { useState, useRef } from 'react';
import {
  Scissors,
  Camera,
  Upload,
  Loader2,
  Users,
  AlertTriangle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { ParsedReceipt, ItemAssignments, ItemAssignment, PersonTotal, CustomItem } from '@/types/receipt';
import styles from './ReceiptScanner.module.css';

interface ReceiptScannerProps {
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
  sharingSession: boolean;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onScanReceipt: () => void;
  onAssignmentChange: (itemIndex: number | string, name: string) => void;
  onAddAssignment: (itemIndex: number | string) => void;
  onUpdateAssignment: (itemIndex: number | string, assignmentIndex: number, updates: Partial<ItemAssignment>) => void;
  onRemoveAssignment: (itemIndex: number | string, assignmentIndex: number) => void;
  onUpdateItemPrice: (itemIndex: number, price: number) => void;
  onUpdateItemQuantity: (itemIndex: number, quantity: number) => void;
  onAddCustomItem: () => void;
  onUpdateCustomItem: (id: string, updates: Partial<CustomItem>) => void;
  onRemoveCustomItem: (id: string) => void;
  onCalculateTotals: () => void;
  onShareWithGroup: () => void;
}

export function ReceiptScanner({
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
  sharingSession,
  onImageSelect,
  onScanReceipt,
  onAssignmentChange,
  onAddAssignment,
  onUpdateAssignment,
  onRemoveAssignment,
  onUpdateItemPrice,
  onUpdateItemQuantity,
  onAddCustomItem,
  onUpdateCustomItem,
  onRemoveCustomItem,
  onCalculateTotals,
  onShareWithGroup,
}: ReceiptScannerProps) {
  const [expandedItems, setExpandedItems] = useState<Record<number | string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleExpanded = (index: number | string) => {
    setExpandedItems((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const getAssignedQuantity = (itemIndex: number | string): number => {
    const itemAssignments = assignments[itemIndex] || [];
    return itemAssignments.reduce((sum, a) => sum + a.quantity, 0);
  };

  const getItemPrice = (index: number): number => {
    if (priceOverrides[index] !== undefined) {
      return priceOverrides[index];
    }
    return parsedData?.items[index]?.price || 0;
  };

  const getItemQuantity = (index: number): number => {
    if (quantityOverrides[index] !== undefined) {
      return quantityOverrides[index];
    }
    return parsedData?.items[index]?.quantity || 1;
  };

  const getStatusClass = (remainingQty: number) => {
    if (remainingQty < 0) return styles.statusOver;
    if (remainingQty === 0) return styles.statusComplete;
    return styles.statusUnassigned;
  };

  return (
    <div className={styles.container}>
      {/* Datalist for person name autocomplete */}
      <datalist id="person-names">
        {uniquePersonNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerIcon}>
          <Scissors size={28} />
        </div>
        <h1 className={styles.title}>Divvy</h1>
        <p className={styles.subtitle}>Divvy up bills with friends, effortlessly</p>
      </header>

      {/* Upload section */}
      <div className={styles.uploadSection}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onImageSelect}
          className={styles.hiddenInput}
          aria-label="Upload receipt image"
        />

        {!imagePreview ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={styles.uploadCard}
          >
            <div className={styles.uploadIconCircle}>
              <Camera size={32} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textAlign: 'center' }}>
              <span className={styles.uploadLabel}>Upload a receipt</span>
              <span className={styles.uploadHint}>Take a photo or choose from your gallery</span>
            </div>
          </button>
        ) : (
          <div className={styles.imageSection}>
            <div className={styles.imageWrapper}>
              <img
                src={imagePreview}
                alt="Receipt preview"
                className={styles.imagePreview}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={styles.changeButton}
              >
                <Upload size={14} />
                Change
              </button>
            </div>

            <button
              onClick={onScanReceipt}
              disabled={loading}
              className={styles.scanButton}
            >
              {loading ? (
                <>
                  <Loader2 size={20} className={styles.spinner} />
                  Scanning...
                </>
              ) : (
                'Scan Receipt'
              )}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className={styles.errorBox}>{error}</div>
      )}

      {parsedData && (
        <div className={styles.parsedSection}>
          {/* Share with Group button */}
          <button
            onClick={onShareWithGroup}
            disabled={itemsTotalMismatch || sharingSession}
            className={styles.shareButton}
          >
            {sharingSession ? (
              <>
                <Loader2 size={20} className={styles.spinner} />
                Creating session...
              </>
            ) : (
              <>
                <Users size={20} />
                Split with friends
              </>
            )}
          </button>
          {itemsTotalMismatch && (
            <p className={styles.shareHint}>
              Fix item totals to enable group sharing
            </p>
          )}

          {/* Items list */}
          <div className={styles.itemsWrapper}>
            {/* Validation warning */}
            {itemsTotalMismatch && (
              <div className={styles.warningBanner}>
                <div className={styles.warningIcon}>
                  <AlertTriangle size={20} />
                </div>
                <div className={styles.warningContent}>
                  <span className={styles.warningTitle}>Total mismatch</span>
                  <span className={styles.warningText}>
                    Items total (${itemsTotal.toFixed(2)}) doesn&apos;t match subtotal ($
                    {parsedData.subtotal?.toFixed(2)}). Correct the prices or quantities below.
                  </span>
                </div>
              </div>
            )}

            {/* Restaurant name */}
            {parsedData.restaurant_name && (
              <p className={styles.restaurantName}>{parsedData.restaurant_name}</p>
            )}

            {/* Parsed items */}
            {parsedData.items && parsedData.items.length > 0 ? (
              <ul className={styles.itemsList}>
                {parsedData.items.map((item, index) => {
                  const itemQty = getItemQuantity(index);
                  const isMultiQuantity = itemQty > 1;
                  const isExpanded = expandedItems[index];
                  const itemAssignments = assignments[index] || [];
                  const assignedQty = getAssignedQuantity(index);
                  const remainingQty = itemQty - assignedQty;

                  return (
                    <li key={index} className={styles.itemCard}>
                      <div className={styles.itemHeader}>
                        <div className={styles.itemInfo}>
                          <span className={styles.itemName}>{item.name}</span>
                          <div className={styles.priceQtyRow}>
                            <span className={styles.priceGroup}>
                              $
                              <input
                                type="text"
                                inputMode="decimal"
                                defaultValue={getItemPrice(index).toFixed(2)}
                                key={`price-${index}-${parsedData?.items[index]?.price}`}
                                onBlur={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (!isNaN(val) && val >= 0) {
                                    onUpdateItemPrice(index, val);
                                  }
                                }}
                                className={styles.priceInput}
                              />
                            </span>
                            {itemQty > 1 && (
                              <span className={styles.qtyGroup}>
                                x
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  defaultValue={itemQty}
                                  key={`qty-${index}-${parsedData?.items[index]?.quantity}`}
                                  onBlur={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val) && val >= 0) {
                                      onUpdateItemQuantity(index, val);
                                    }
                                  }}
                                  className={styles.qtyInput}
                                />
                              </span>
                            )}
                          </div>
                        </div>

                        <div className={styles.itemControls}>
                          {isMultiQuantity ? (
                            <button
                              onClick={() => toggleExpanded(index)}
                              className={`${styles.splitButton} ${isExpanded ? styles.splitButtonExpanded : ''}`}
                            >
                              Split
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          ) : (
                            <input
                              type="text"
                              placeholder="Who?"
                              list="person-names"
                              value={itemAssignments[0]?.name || ''}
                              onChange={(e) => onAssignmentChange(index, e.target.value)}
                              className={styles.assignInput}
                            />
                          )}
                        </div>
                      </div>

                      {/* Expanded section for multi-quantity items */}
                      {isMultiQuantity && isExpanded && (
                        <div className={styles.expandedSection}>
                          {itemAssignments.map((assignment, aIndex) => (
                            <div key={aIndex} className={styles.assignmentRow}>
                              <input
                                type="text"
                                placeholder="Name"
                                list="person-names"
                                value={assignment.name}
                                onChange={(e) => onUpdateAssignment(index, aIndex, { name: e.target.value })}
                                className={styles.personNameInput}
                              />
                              <span className={styles.timesSymbol}>x</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={assignment.quantity || ''}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const val = raw === '' ? 0 : parseInt(raw);
                                  if (!isNaN(val)) {
                                    onUpdateAssignment(index, aIndex, { quantity: val });
                                  }
                                }}
                                className={styles.assignQtyInput}
                              />
                              <button
                                onClick={() => onRemoveAssignment(index, aIndex)}
                                className={styles.removeButton}
                                aria-label="Remove person"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}

                          <div className={styles.addPersonRow}>
                            <button
                              onClick={() => onAddAssignment(index)}
                              disabled={remainingQty <= 0}
                              className={styles.addPersonButton}
                            >
                              <Plus size={14} />
                              Add person
                            </button>
                            <span className={`${styles.assignmentStatus} ${getStatusClass(remainingQty)}`}>
                              {remainingQty > 0
                                ? `${remainingQty} of ${itemQty} left`
                                : remainingQty < 0
                                  ? `Over by ${Math.abs(remainingQty)}`
                                  : 'All assigned'}
                            </span>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>No items found</p>
            )}

            {/* Custom items */}
            {customItems.length > 0 && (
              <>
                <p className={styles.customItemsHeader}>Added items</p>
                <ul className={styles.itemsList}>
                  {customItems.map((item) => {
                    const itemKey = `custom_${item.id}`;
                    const isMultiQuantity = item.quantity > 1;
                    const isExpanded = expandedItems[itemKey];
                    const itemAssignments = assignments[itemKey] || [];
                    const assignedQty = getAssignedQuantity(itemKey);
                    const remainingQty = item.quantity - assignedQty;

                    return (
                      <li key={item.id} className={`${styles.itemCard} ${styles.customItemCard}`}>
                        <div className={styles.itemHeader}>
                          <div className={styles.itemInfo}>
                            <input
                              type="text"
                              placeholder="Item name"
                              value={item.name}
                              onChange={(e) => onUpdateCustomItem(item.id, { name: e.target.value })}
                              className={styles.customNameInput}
                            />
                            <div className={styles.priceQtyRow}>
                              <span className={styles.priceGroup}>
                                $
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={item.price || ''}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    onUpdateCustomItem(item.id, { price: isNaN(val) ? 0 : val });
                                  }}
                                  className={styles.priceInput}
                                />
                              </span>
                              <span className={styles.qtyGroup}>
                                x
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={item.quantity || ''}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    onUpdateCustomItem(item.id, { quantity: isNaN(val) ? 1 : val });
                                  }}
                                  className={styles.qtyInput}
                                />
                              </span>
                            </div>
                          </div>

                          <div className={styles.itemControls}>
                            {isMultiQuantity ? (
                              <button
                                onClick={() => toggleExpanded(itemKey)}
                                className={`${styles.splitButton} ${isExpanded ? styles.splitButtonExpanded : ''}`}
                              >
                                Split
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            ) : (
                              <input
                                type="text"
                                placeholder="Who?"
                                list="person-names"
                                value={itemAssignments[0]?.name || ''}
                                onChange={(e) => onAssignmentChange(itemKey, e.target.value)}
                                className={styles.assignInput}
                              />
                            )}

                            <button
                              onClick={() => onRemoveCustomItem(item.id)}
                              className={styles.removeButton}
                              aria-label="Remove item"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Expanded section for multi-quantity custom items */}
                        {isMultiQuantity && isExpanded && (
                          <div className={styles.expandedSection}>
                            {itemAssignments.map((assignment, aIndex) => (
                              <div key={aIndex} className={styles.assignmentRow}>
                                <input
                                  type="text"
                                  placeholder="Name"
                                  list="person-names"
                                  value={assignment.name}
                                  onChange={(e) => onUpdateAssignment(itemKey, aIndex, { name: e.target.value })}
                                  className={styles.personNameInput}
                                />
                                <span className={styles.timesSymbol}>x</span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={assignment.quantity || ''}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const val = raw === '' ? 0 : parseInt(raw);
                                    if (!isNaN(val)) {
                                      onUpdateAssignment(itemKey, aIndex, { quantity: val });
                                    }
                                  }}
                                  className={styles.assignQtyInput}
                                />
                                <button
                                  onClick={() => onRemoveAssignment(itemKey, aIndex)}
                                  className={styles.removeButton}
                                  aria-label="Remove person"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}

                            <div className={styles.addPersonRow}>
                              <button
                                onClick={() => onAddAssignment(itemKey)}
                                disabled={remainingQty <= 0}
                                className={styles.addPersonButton}
                              >
                                <Plus size={14} />
                                Add person
                              </button>
                              <span className={`${styles.assignmentStatus} ${getStatusClass(remainingQty)}`}>
                                {remainingQty > 0
                                  ? `${remainingQty} of ${item.quantity} left`
                                  : remainingQty < 0
                                    ? `Over by ${Math.abs(remainingQty)}`
                                    : 'All assigned'}
                              </span>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            {/* Add Item button */}
            <button
              onClick={onAddCustomItem}
              className={styles.addItemButton}
            >
              <Plus size={16} />
              Add missing item
            </button>

            {/* Totals */}
            <div className={styles.totalsSection}>
              <div className={styles.totalsRow}>
                <span className={styles.totalsLabel}>
                  Subtotal
                </span>
                <span className={styles.totalsValue}>${parsedData.subtotal?.toFixed(2) || 'N/A'}</span>
              </div>
              <div className={styles.totalsRow}>
                <span className={styles.totalsLabel}>
                  Tax
                  {parsedData.tax != null && parsedData.subtotal != null && parsedData.subtotal > 0 && (
                    <span className={styles.percentText}>({((parsedData.tax / parsedData.subtotal) * 100).toFixed(1)}%)</span>
                  )}
                </span>
                <span className={styles.totalsValue}>${parsedData.tax?.toFixed(2) || 'N/A'}</span>
              </div>
              <div className={styles.totalsRow}>
                <span className={styles.totalsLabel}>
                  Tip
                  {parsedData.tip != null && parsedData.subtotal != null && parsedData.subtotal > 0 && (
                    <span className={styles.percentText}>({((parsedData.tip / parsedData.subtotal) * 100).toFixed(1)}%)</span>
                  )}
                </span>
                <span className={styles.totalsValue}>${parsedData.tip?.toFixed(2) || 'N/A'}</span>
              </div>
              <div className={`${styles.totalsRow} ${styles.totalsDivider}`}>
                <span className={styles.totalsBold}>Total</span>
                <span className={styles.totalsBold}>${parsedData.total?.toFixed(2) || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Calculate button */}
          <div>
            <button
              onClick={onCalculateTotals}
              disabled={!allItemsAssigned}
              className={styles.calculateButton}
            >
              Calculate Totals
            </button>
            {!allItemsAssigned && (
              <p className={styles.assignHint}>
                Assign all items to a person to calculate
              </p>
            )}
          </div>

          {/* Split summary */}
          {personTotals && personTotals.length > 0 && (
            <div className={styles.splitSummary}>
              <h3 className={styles.splitSummaryTitle}>Split Summary</h3>
              {personTotals.map((person) => (
                <div key={person.name} className={styles.personCard}>
                  <div className={styles.personHeader}>
                    <div className={styles.personLeft}>
                      <div className={styles.personAvatar}>
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                      <span className={styles.personName}>{person.name}</span>
                    </div>
                    <span className={styles.personTotal}>
                      ${person.total.toFixed(2)}
                    </span>
                  </div>
                  <div className={styles.personBreakdown}>
                    <span>Food ${person.subtotal.toFixed(2)}</span>
                    <span>Tax ${person.tax.toFixed(2)}</span>
                    <span>Tip ${person.tip.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* How it works + tip */}
      {!parsedData && !loading && !error && (
        <div className={styles.howItWorks}>
          <h2 className={styles.howItWorksTitle}>How it works</h2>
          <ol className={styles.stepsList}>
            <li className={styles.step}>
              <span className={styles.stepNumber}>1</span>
              <span className={styles.stepText}>Upload or snap a photo of your receipt</span>
            </li>
            <li className={styles.step}>
              <span className={styles.stepNumber}>2</span>
              <span className={styles.stepText}>We scan and pull out every item automatically</span>
            </li>
            <li className={styles.step}>
              <span className={styles.stepNumber}>3</span>
              <span className={styles.stepText}>Assign names to the items or share a link with friends so everyone can claim their own items</span>
            </li>
            <li className={styles.step}>
              <span className={styles.stepNumber}>4</span>
              <span className={styles.stepText}>See exactly what each person owes — tax and tip included</span>
            </li>
          </ol>
          <p className={styles.tip}>
            Tip: Make sure the receipt image is clear, vertically aligned, and
            all items and totals are visible for best accuracy.
          </p>
        </div>
      )}
    </div>
  );
}
