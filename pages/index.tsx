import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { ReceiptScanner } from '@/components/ReceiptScanner';
import { useReceiptScanner } from '@/hooks/useReceiptScanner';

// localStorage key for session
const STORAGE_KEY_SESSION = 'receiptSplitter_currentSession';

export default function Home() {
  const router = useRouter();
  const [sharingSession, setSharingSession] = useState(false);

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

  const handleShareWithGroup = async () => {
    if (!parsedData || itemsTotalMismatch) return;

    setSharingSession(true);

    try {
      const res = await fetch('/api/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receipt: parsedData,
          customItems,
          priceOverrides,
          quantityOverrides,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('Failed to create session:', data.error);
        setSharingSession(false);
        return;
      }

      // Save session ID to localStorage
      localStorage.setItem(STORAGE_KEY_SESSION, data.sessionId);

      // Redirect to session page
      router.push(`/session/${data.sessionId}`);
    } catch (err) {
      console.error('Failed to create session:', err);
      setSharingSession(false);
    }
  };

  return (
    <>
      <Head>
        <title>Split - Split bills with friends</title>
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
        sharingSession={sharingSession}
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
        onShareWithGroup={handleShareWithGroup}
      />
    </>
  );
}