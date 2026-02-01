import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Session, PersonTotal } from '@/types/receipt';
import styles from './Session.module.css';

// localStorage keys
const STORAGE_KEY_NAME = 'receiptSplitter_userName';
const STORAGE_KEY_SESSION = 'receiptSplitter_currentSession';

interface SessionData {
  session: Session;
  allItemsClaimed: boolean;
}

export default function SessionPage() {
  const router = useRouter();
  const { id } = router.query;

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch session data
  const fetchSession = useCallback(async () => {
    if (!id) return;

    try {
      const res = await fetch(`/api/session/${id}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to load session');
        return;
      }

      setSessionData(data);
      setError(null);
    } catch (err) {
      setError('Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Initial load + check for saved name
  useEffect(() => {
    if (!id) return;

    const initSession = async () => {
      // Check for saved user name
      const savedName = localStorage.getItem(STORAGE_KEY_NAME);
      const savedSession = localStorage.getItem(STORAGE_KEY_SESSION);

      // If user has a name saved and it's for this session, auto-join
      if (savedName && savedSession === id) {
        setCurrentUser(savedName);

        // Also call join API to ensure they're in the participants list
        try {
          await fetch(`/api/session/${id}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: savedName }),
          });
        } catch (err) {
          // Ignore errors - they might already be joined
        }
      }

      fetchSession();
    };

    initSession();
  }, [id, fetchSession]);

  // Polling every 3 seconds
  useEffect(() => {
    if (!id || !currentUser) return;

    const interval = setInterval(fetchSession, 3000);
    return () => clearInterval(interval);
  }, [id, currentUser, fetchSession]);

  // Join the session
  const handleJoin = async () => {
    if (!nameInput.trim() || !id) return;

    setJoining(true);
    setError(null);

    try {
      const res = await fetch(`/api/session/${id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to join session');
        return;
      }

      // Save name to localStorage
      localStorage.setItem(STORAGE_KEY_NAME, nameInput.trim());
      localStorage.setItem(STORAGE_KEY_SESSION, id as string);
      setCurrentUser(nameInput.trim());

      // Refresh session data
      fetchSession();
    } catch (err) {
      setError('Failed to join session');
    } finally {
      setJoining(false);
    }
  };

  // Claim or unclaim an item
  const handleClaim = async (itemKey: string, quantity: number) => {
    if (!currentUser || !id) return;

    setClaimError(null);

    try {
      const res = await fetch(`/api/session/${id}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemKey,
          personName: currentUser,
          quantity,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.claimedBy) {
          setClaimError(`Already claimed by ${data.claimedBy}`);
        } else {
          setClaimError(data.error || 'Failed to claim item');
        }
        // Refresh to get latest state
        fetchSession();
        return;
      }

      // Refresh session data
      fetchSession();
    } catch (err) {
      setClaimError('Failed to claim item');
    }
  };

  // Calculate the split
  const handleCalculate = async () => {
    if (!id) return;

    setCalculating(true);

    try {
      const res = await fetch(`/api/session/${id}/calculate`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to calculate split');
        return;
      }

      // Refresh to show results
      fetchSession();
    } catch (err) {
      setError('Failed to calculate split');
    } finally {
      setCalculating(false);
    }
  };

  // Copy shareable link
  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to get item quantity
  const getItemQuantity = (session: Session, index: number): number => {
    if (session.quantityOverrides[index] !== undefined) {
      return session.quantityOverrides[index];
    }
    return session.receipt.items[index]?.quantity || 1;
  };

  // Helper to get item price
  const getItemPrice = (session: Session, index: number): number => {
    if (session.priceOverrides[index] !== undefined) {
      return session.priceOverrides[index];
    }
    return session.receipt.items[index]?.price || 0;
  };

  // Get claims for an item by the current user
  const getUserClaim = (itemKey: string): number => {
    if (!sessionData || !currentUser) return 0;
    const claims = sessionData.session.claims[itemKey] || [];
    const userClaim = claims.find(c => c.personName === currentUser);
    return userClaim?.quantity || 0;
  };

  // Get total claimed for an item
  const getTotalClaimed = (itemKey: string): number => {
    if (!sessionData) return 0;
    const claims = sessionData.session.claims[itemKey] || [];
    return claims.reduce((sum, c) => sum + c.quantity, 0);
  };

  // Get who claimed an item
  const getClaimers = (itemKey: string): string[] => {
    if (!sessionData) return [];
    const claims = sessionData.session.claims[itemKey] || [];
    return claims.map(c => `${c.personName} (${c.quantity})`);
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loadingText}>Loading session...</p>
      </div>
    );
  }

  // Error state (session not found)
  if (error && !sessionData) {
    return (
      <div className={styles.container}>
        <div className={styles.errorBox}>
          <strong>Error:</strong> {error}
        </div>
        <button onClick={() => router.push('/')} className={styles.backButton}>
          Go to Home
        </button>
      </div>
    );
  }

  // Join flow - user hasn't entered their name yet
  if (!currentUser) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Join Session | Receipt Splitter</title>
        </Head>

        <h1 className={styles.title}>Join Split Session</h1>
        {sessionData?.session.receipt.restaurant_name && (
          <p className={styles.restaurantName}>
            {sessionData.session.receipt.restaurant_name}
          </p>
        )}

        <div className={styles.joinBox}>
          <p>Enter your name to join and claim your items:</p>
          <input
            type="text"
            placeholder="Your name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            className={styles.nameInput}
            autoFocus
          />
          <button
            onClick={handleJoin}
            disabled={!nameInput.trim() || joining}
            className={styles.joinButton}
          >
            {joining ? 'Joining...' : 'Join Session'}
          </button>
          {error && <p className={styles.errorText}>{error}</p>}
        </div>
      </div>
    );
  }

  const session = sessionData!.session;
  const allItemsClaimed = sessionData!.allItemsClaimed;

  return (
    <div className={styles.container}>
      <Head>
        <title>
          {session.receipt.restaurant_name || 'Split Session'} | Receipt Splitter
        </title>
      </Head>

      {/* Header */}
      <h1 className={styles.title}>
        {session.receipt.restaurant_name || 'Split Session'}
      </h1>
      <p className={styles.welcomeText}>Welcome, {currentUser}!</p>

      {/* Shareable link */}
      <div className={styles.shareBox}>
        <p className={styles.shareLabel}>Share this link with your group:</p>
        <div className={styles.shareRow}>
          <input
            type="text"
            readOnly
            value={typeof window !== 'undefined' ? window.location.href : ''}
            className={styles.shareInput}
          />
          <button onClick={copyLink} className={styles.copyButton}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Participants */}
      <div className={styles.participantsBox}>
        <strong>People in this session ({session.participants.length}):</strong>
        {session.participants.length > 0 ? (
          <span className={styles.participantsList}> {session.participants.join(', ')}</span>
        ) : (
          <span className={styles.waitingText}> Waiting for people to join...</span>
        )}
      </div>

      {/* Claim error notification */}
      {claimError && (
        <div className={styles.claimErrorBox}>
          {claimError}
          <button onClick={() => setClaimError(null)} className={styles.dismissButton}>
            Dismiss
          </button>
        </div>
      )}

      {/* Items list */}
      {!session.isCalculated ? (
        <div className={styles.itemsSection}>
          <h2>Claim Your Items</h2>
          <p className={styles.hintText}>
            Tap items you ordered to claim them. You can claim multiple quantities of the same item.
          </p>

          <ul className={styles.itemsList}>
            {session.receipt.items.map((item, index) => {
              const itemKey = String(index);
              const itemQty = getItemQuantity(session, index);
              const itemPrice = getItemPrice(session, index);
              const userClaim = getUserClaim(itemKey);
              const totalClaimed = getTotalClaimed(itemKey);
              const remaining = itemQty - totalClaimed;
              const claimers = getClaimers(itemKey);

              return (
                <li key={index} className={styles.itemCard}>
                  <div className={styles.itemHeader}>
                    <div className={styles.itemInfo}>
                      <strong className={styles.itemName}>{item.name}</strong>
                      <span className={styles.itemPrice}>
                        ${itemPrice.toFixed(2)} {itemQty > 1 && `(x${itemQty})`}
                      </span>
                    </div>
                  </div>

                  <div className={styles.claimSection}>
                    {/* Claim controls */}
                    <div className={styles.claimControls}>
                      <button
                        onClick={() => handleClaim(itemKey, Math.max(0, userClaim - 1))}
                        disabled={userClaim === 0}
                        className={styles.claimButton}
                      >
                        -
                      </button>
                      <span className={styles.claimCount}>
                        You: {userClaim}
                      </span>
                      <button
                        onClick={() => handleClaim(itemKey, userClaim + 1)}
                        disabled={remaining <= 0}
                        className={styles.claimButton}
                      >
                        +
                      </button>
                    </div>

                    {/* Status */}
                    <div className={styles.claimStatus}>
                      {totalClaimed === itemQty ? (
                        <span className={styles.statusComplete}>
                          All claimed
                        </span>
                      ) : (
                        <span className={styles.statusRemaining}>
                          {remaining} of {itemQty} remaining
                        </span>
                      )}
                    </div>

                    {/* Who claimed */}
                    {claimers.length > 0 && (
                      <div className={styles.claimers}>
                        Claimed by: {claimers.join(', ')}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}

            {/* Custom items */}
            {session.customItems.map((item) => {
              const itemKey = `custom_${item.id}`;
              const userClaim = getUserClaim(itemKey);
              const totalClaimed = getTotalClaimed(itemKey);
              const remaining = item.quantity - totalClaimed;
              const claimers = getClaimers(itemKey);

              return (
                <li key={item.id} className={`${styles.itemCard} ${styles.customItemCard}`}>
                  <div className={styles.itemHeader}>
                    <div className={styles.itemInfo}>
                      <strong className={styles.itemName}>{item.name}</strong>
                      <span className={styles.itemPrice}>
                        ${item.price.toFixed(2)} {item.quantity > 1 && `(x${item.quantity})`}
                      </span>
                    </div>
                  </div>

                  <div className={styles.claimSection}>
                    <div className={styles.claimControls}>
                      <button
                        onClick={() => handleClaim(itemKey, Math.max(0, userClaim - 1))}
                        disabled={userClaim === 0}
                        className={styles.claimButton}
                      >
                        -
                      </button>
                      <span className={styles.claimCount}>
                        You: {userClaim}
                      </span>
                      <button
                        onClick={() => handleClaim(itemKey, userClaim + 1)}
                        disabled={remaining <= 0}
                        className={styles.claimButton}
                      >
                        +
                      </button>
                    </div>

                    <div className={styles.claimStatus}>
                      {totalClaimed === item.quantity ? (
                        <span className={styles.statusComplete}>
                          All claimed
                        </span>
                      ) : (
                        <span className={styles.statusRemaining}>
                          {remaining} of {item.quantity} remaining
                        </span>
                      )}
                    </div>

                    {claimers.length > 0 && (
                      <div className={styles.claimers}>
                        Claimed by: {claimers.join(', ')}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Totals info */}
          <div className={styles.totalsInfo}>
            <p><strong>Subtotal:</strong> ${session.receipt.subtotal?.toFixed(2) || 'N/A'}</p>
            <p><strong>Tax:</strong> ${session.receipt.tax?.toFixed(2) || 'N/A'}</p>
            <p><strong>Tip:</strong> ${session.receipt.tip?.toFixed(2) || 'N/A'}</p>
            <p><strong>Total:</strong> ${session.receipt.total?.toFixed(2) || 'N/A'}</p>
          </div>

          {/* Calculate button */}
          <button
            onClick={handleCalculate}
            disabled={!allItemsClaimed || calculating}
            className={styles.calculateButton}
          >
            {calculating ? 'Calculating...' : 'Calculate Split'}
          </button>
          {!allItemsClaimed && (
            <p className={styles.calculateHint}>
              All items must be claimed before calculating
            </p>
          )}
        </div>
      ) : (
        /* Results view */
        <div className={styles.resultsSection}>
          <h2>Split Results</h2>
          <p className={styles.lockedText}>
            Items are now locked. Here's what everyone owes:
          </p>

          {session.splitResults && session.splitResults.map((person: PersonTotal) => (
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

          {/* Show receipt totals */}
          <div className={styles.receiptTotals}>
            <h3>Receipt Totals</h3>
            <p><strong>Subtotal:</strong> ${session.receipt.subtotal?.toFixed(2) || 'N/A'}</p>
            <p><strong>Tax:</strong> ${session.receipt.tax?.toFixed(2) || 'N/A'}</p>
            <p><strong>Tip:</strong> ${session.receipt.tip?.toFixed(2) || 'N/A'}</p>
            <p><strong>Total:</strong> ${session.receipt.total?.toFixed(2) || 'N/A'}</p>
          </div>
        </div>
      )}

      {error && (
        <div className={styles.errorBox}>
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}