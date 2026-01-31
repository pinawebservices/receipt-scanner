import Head from 'next/head';
import { ReceiptScanner } from '@/components/ReceiptScanner';
import { useReceiptScanner } from '@/hooks/useReceiptScanner';

export default function Home() {
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
  } = useReceiptScanner();

  return (
    <>
      <Head>
        <title>Receipt Scanner - Proof of Concept</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <ReceiptScanner
        imagePreview={imagePreview}
        parsedData={parsedData}
        loading={loading}
        error={error}
        assignments={assignments}
        priceOverrides={priceOverrides}
        quantityOverrides={quantityOverrides}
        customItems={customItems}
        personTotals={personTotals}
        allItemsAssigned={allItemsAssigned}
        itemsTotal={itemsTotal}
        itemsTotalMismatch={itemsTotalMismatch}
        uniquePersonNames={uniquePersonNames}
        onImageSelect={handleImageSelect}
        onScanReceipt={handleScanReceipt}
        onAssignmentChange={handleAssignmentChange}
        onAddAssignment={addAssignment}
        onUpdateAssignment={updateAssignment}
        onRemoveAssignment={removeAssignment}
        onUpdateItemPrice={updateItemPrice}
        onUpdateItemQuantity={updateItemQuantity}
        onAddCustomItem={addCustomItem}
        onUpdateCustomItem={updateCustomItem}
        onRemoveCustomItem={removeCustomItem}
        onCalculateTotals={calculateTotals}
      />
    </>
  );
}