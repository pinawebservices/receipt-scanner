import { useState } from 'react';

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
}: ReceiptScannerProps) {
  const [expandedItems, setExpandedItems] = useState<Record<number | string, boolean>>({});

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

      <h1 className={styles.title}>Receipt Splitter</h1>
      <p className={styles.subtitle}>Upload a receipt image to start</p>
      <p><span><b>Note: </b></span> Make sure the image is clear, vertically aligned and all individual items, totals, taxes, etc. are clear for best accuracy.</p>

      <div className={styles.uploadSection}>
        <input
          type="file"
          accept="image/*"
          onChange={onImageSelect}
          className={styles.fileInput}
        />

        {imagePreview && (
          <div className={styles.imageSection}>
            <h3>Receipt Image:</h3>
            <img
              src={imagePreview}
              alt="Receipt preview"
              className={styles.imagePreview}
            />

            <button
              onClick={onScanReceipt}
              disabled={loading}
              className={styles.scanButton}
            >
              {loading ? 'Scanning...' : 'Scan Receipt'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className={styles.errorBox}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {parsedData && (
        <div className={styles.parsedSection}>
          <h2>Parsed Receipt Data:</h2>

          <div className={styles.dataBox}>
            {/* Validation warning - at top */}
            {itemsTotalMismatch && (
              <div className={styles.warningBanner}>
                <strong className={styles.warningTitle}>Warning:</strong>
                <span className={styles.warningText}>
                  {' '}Items total (${itemsTotal.toFixed(2)}) doesn't match subtotal (${parsedData.subtotal?.toFixed(2)}).
                  Please correct the prices/quantities below.
                </span>
              </div>
            )}

            <h3>Items:</h3>
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
                      {/* Item header row */}
                      <div className={styles.itemHeader}>
                        <span className={styles.itemInfo}>
                          <strong className={styles.itemName}>{item.name}</strong>
                          <span className={styles.priceQtyRow}>
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
                          </span>
                        </span>

                        {isMultiQuantity ? (
                          <button
                            onClick={() => toggleExpanded(index)}
                            className={`${styles.splitButton} ${isExpanded ? styles.splitButtonExpanded : ''}`}
                          >
                            {isExpanded ? 'Collapse' : 'Split Item'}
                          </button>
                        ) : (
                          <input
                            type="text"
                            placeholder="Who's paying?"
                            list="person-names"
                            value={itemAssignments[0]?.name || ''}
                            onChange={(e) => onAssignmentChange(index, e.target.value)}
                            className={styles.assignInput}
                          />
                        )}
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
                              <span>×</span>
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
                              >
                                Remove
                              </button>
                            </div>
                          ))}

                          <div className={styles.addPersonRow}>
                            <button
                              onClick={() => onAddAssignment(index)}
                              disabled={remainingQty <= 0}
                              className={styles.addPersonButton}
                            >
                              + Add Person
                            </button>
                            <span className={`${styles.assignmentStatus} ${getStatusClass(remainingQty)}`}>
                              {remainingQty > 0
                                ? `${remainingQty} of ${itemQty} unassigned`
                                : remainingQty < 0
                                  ? `Over-assigned by ${Math.abs(remainingQty)}!`
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

            {/* Custom items section */}
            {customItems.length > 0 && (
              <>
                <h4 style={{ marginTop: '20px', marginBottom: '10px', color: '#666' }}>Added Items:</h4>
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
                          <span className={styles.itemInfo}>
                            <input
                              type="text"
                              placeholder="Item name"
                              value={item.name}
                              onChange={(e) => onUpdateCustomItem(item.id, { name: e.target.value })}
                              className={styles.customNameInput}
                            />
                            <span className={styles.priceQtyRow}>
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
                            </span>
                          </span>

                          {isMultiQuantity ? (
                            <button
                              onClick={() => toggleExpanded(itemKey)}
                              className={`${styles.splitButton} ${isExpanded ? styles.splitButtonExpanded : ''}`}
                            >
                              {isExpanded ? 'Collapse' : 'Split Item'}
                            </button>
                          ) : (
                            <input
                              type="text"
                              placeholder="Who's paying?"
                              list="person-names"
                              value={itemAssignments[0]?.name || ''}
                              onChange={(e) => onAssignmentChange(itemKey, e.target.value)}
                              className={styles.assignInput}
                            />
                          )}

                          <button
                            onClick={() => onRemoveCustomItem(item.id)}
                            className={styles.removeButton}
                          >
                            Remove
                          </button>
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
                                <span>×</span>
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
                                >
                                  Remove
                                </button>
                              </div>
                            ))}

                            <div className={styles.addPersonRow}>
                              <button
                                onClick={() => onAddAssignment(itemKey)}
                                disabled={remainingQty <= 0}
                                className={styles.addPersonButton}
                              >
                                + Add Person
                              </button>
                              <span className={`${styles.assignmentStatus} ${getStatusClass(remainingQty)}`}>
                                {remainingQty > 0
                                  ? `${remainingQty} of ${item.quantity} unassigned`
                                  : remainingQty < 0
                                    ? `Over-assigned by ${Math.abs(remainingQty)}!`
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
              + Add Missing Item
            </button>

            <hr className={styles.divider} />

            <div className={styles.totalsSection}>
              <h3>Totals:</h3>
              <p><strong>Subtotal:</strong> ${parsedData.subtotal?.toFixed(2) || 'N/A'}</p>
              <p>
                <strong>Tax:</strong> ${parsedData.tax?.toFixed(2) || 'N/A'}
                {parsedData.tax != null && parsedData.subtotal != null && parsedData.subtotal > 0 && (
                  <span className={styles.percentText}> ({((parsedData.tax / parsedData.subtotal) * 100).toFixed(1)}%)</span>
                )}
              </p>
              <p>
                <strong>Tip:</strong> ${parsedData.tip?.toFixed(2) || 'N/A'}
                {parsedData.tip != null && parsedData.subtotal != null && parsedData.subtotal > 0 && (
                  <span className={styles.percentText}> ({((parsedData.tip / parsedData.subtotal) * 100).toFixed(1)}%)</span>
                )}
              </p>
              <p><strong>Total:</strong> ${parsedData.total?.toFixed(2) || 'N/A'}</p>

              {parsedData.restaurant_name && (
                <p><strong>Restaurant:</strong> {parsedData.restaurant_name}</p>
              )}
            </div>

            <hr className={styles.divider} />

            <button
              onClick={onCalculateTotals}
              disabled={!allItemsAssigned}
              className={styles.calculateButton}
            >
              Calculate Totals
            </button>
            {!allItemsAssigned && (
              <p className={styles.assignHint}>
                Assign all items to enable calculation
              </p>
            )}
          </div>

          {personTotals && personTotals.length > 0 && (
            <div className={styles.splitSummary}>
              <h3>Split Summary</h3>
              {personTotals.map((person) => (
                <div key={person.name} className={styles.personCard}>
                  <div className={styles.personHeader}>
                    <strong className={styles.personName}>{person.name}</strong>
                    <strong className={styles.personTotal}>
                      ${person.total.toFixed(2)}
                    </strong>
                  </div>
                  <div className={styles.personBreakdown}>
                    <span>Subtotal: ${person.subtotal.toFixed(2)}</span>
                    <span> | Tax: ${person.tax.toFixed(2)}</span>
                    <span> | Tip: ${person.tip.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/*<details className={styles.jsonSection}>*/}
          {/*  <summary className={styles.jsonSummary}>*/}
          {/*    Show Raw JSON Response*/}
          {/*  </summary>*/}
          {/*  <pre className={styles.jsonPre}>*/}
          {/*    {JSON.stringify(parsedData, null, 2)}*/}
          {/*  </pre>*/}
          {/*</details>*/}
        </div>
      )}
    </div>
  );
}