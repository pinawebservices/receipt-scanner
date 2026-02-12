import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
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
} from 'lucide-react';
import { track, identifyUser } from '@/lib/analytics';
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
      const savedName = localStorage.getItem(STORAGE_KEY_NAME);
      const savedSession = localStorage.getItem(STORAGE_KEY_SESSION);

      if (savedName && savedSession === id) {
        setCurrentUser(savedName);

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

      localStorage.setItem(STORAGE_KEY_NAME, nameInput.trim());
      localStorage.setItem(STORAGE_KEY_SESSION, id as string);
      setCurrentUser(nameInput.trim());

      identifyUser(nameInput.trim());
      track('session_joined', { session_id: id });

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
        fetchSession();
        return;
      }

      track('item_claimed', { item_key: itemKey, quantity });
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

      track('split_calculated', {
        session_id: id,
        participant_count: sessionData?.session.participants.length || 0,
      });
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
    track('link_copied', { session_id: id });
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

  // Get who claimed an item (structured)
  const getClaimers = (itemKey: string): Array<{ name: string; qty: number }> => {
    if (!sessionData) return [];
    const claims = sessionData.session.claims[itemKey] || [];
    return claims.map(c => ({ name: c.personName, qty: c.quantity }));
  };

  // Calculate current user's running total
  const userRunningTotal = (() => {
    if (!sessionData || !currentUser) return 0;
    const session = sessionData.session;
    let total = 0;

    session.receipt.items.forEach((_, index) => {
      const itemKey = String(index);
      const claims = session.claims[itemKey] || [];
      const userClaim = claims.find(c => c.personName === currentUser);
      if (userClaim) {
        const price = getItemPrice(session, index);
        const qty = getItemQuantity(session, index);
        const pricePerUnit = qty > 0 ? price / qty : 0;
        total += pricePerUnit * userClaim.quantity;
      }
    });

    session.customItems.forEach((item) => {
      const itemKey = `custom_${item.id}`;
      const claims = session.claims[itemKey] || [];
      const userClaim = claims.find(c => c.personName === currentUser);
      if (userClaim) {
        const pricePerUnit = item.quantity > 0 ? item.price / item.quantity : 0;
        total += pricePerUnit * userClaim.quantity;
      }
    });

    // Add proportional tax and tip
    const subtotal = session.receipt.subtotal || 0;
    if (subtotal > 0) {
      const taxRate = session.receipt.tax != null ? session.receipt.tax / subtotal : 0;
      const tipRate = session.receipt.tip != null ? session.receipt.tip / subtotal : 0;
      total += total * taxRate + total * tipRate;
    }

    return total;
  })();

  // Loading state
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 size={32} className={styles.spinner} />
        <p className={styles.loadingText}>Loading session...</p>
      </div>
    );
  }

  // Error state (session not found)
  if (error && !sessionData) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorBox}>{error}</div>
        <button onClick={() => router.push('/')} className={styles.backButton}>
          <ArrowLeft size={16} />
          Go home
        </button>
      </div>
    );
  }

  // Join flow - user hasn't entered their name yet
  if (!currentUser) {
    return (
      <div className={styles.joinContainer}>
        <Head>
          <title>Join Session | Split</title>
        </Head>

        <header className={styles.joinHeader}>
          <div className={styles.joinHeaderIcon}>
            <Scissors size={28} />
          </div>
          <h1 className={styles.title}>Join the split</h1>
          {sessionData?.session.receipt.restaurant_name && (
            <p className={styles.restaurantName}>
              {sessionData.session.receipt.restaurant_name}
            </p>
          )}
        </header>

        <div className={styles.joinBox}>
          <p>Enter your first name to claim your items</p>
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
            {joining ? (
              <>
                <Loader2 size={20} className={styles.spinner} />
                Joining...
              </>
            ) : (
              'Join Session'
            )}
          </button>
          {error && <p className={styles.errorText}>{error}</p>}
        </div>
      </div>
    );
  }

  const session = sessionData!.session;
  const allItemsClaimed = sessionData!.allItemsClaimed;

  // Render an item card (shared between parsed and custom items)
  const renderItemCard = (
    itemKey: string,
    name: string,
    price: number,
    qty: number,
    isCustom: boolean = false,
    key: string | number,
  ) => {
    const userClaim = getUserClaim(itemKey);
    const totalClaimed = getTotalClaimed(itemKey);
    const remaining = qty - totalClaimed;
    const claimers = getClaimers(itemKey);
    const fullyClaimedByOthers = remaining <= 0 && userClaim === 0;

    let cardClass = styles.itemCard;
    if (isCustom) cardClass += ` ${styles.customItemCard}`;
    if (userClaim > 0) cardClass += ` ${styles.itemCardClaimed}`;
    if (totalClaimed === qty) cardClass += ` ${styles.itemCardFullyClaimed}`;

    return (
      <li key={key} className={cardClass}>
        <div className={styles.itemContent}>
          <div className={styles.itemInfo}>
            <strong className={styles.itemName}>{name}</strong>
            <span className={styles.itemPrice}>
              ${price.toFixed(2)} {qty > 1 && `x${qty}`}
            </span>
            {/* Claimer pills */}
            {claimers.length > 0 && (
              <div className={styles.claimerPills}>
                {claimers.map((c) => (
                  <span
                    key={c.name}
                    className={`${styles.claimerPill} ${c.name === currentUser ? styles.claimerPillCurrent : ''}`}
                  >
                    {c.name}{c.qty > 1 && ` x${c.qty}`}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Claim controls */}
          <div className={styles.claimControls}>
            <button
              onClick={() => handleClaim(itemKey, Math.max(0, userClaim - 1))}
              disabled={userClaim === 0}
              className={styles.claimButton}
              aria-label="Decrease claim"
            >
              <Minus size={16} />
            </button>
            <span className={`${styles.claimCount} ${userClaim > 0 ? styles.claimCountActive : styles.claimCountInactive}`}>
              {userClaim}
            </span>
            <button
              onClick={() => handleClaim(itemKey, userClaim + 1)}
              disabled={fullyClaimedByOthers || remaining <= 0}
              className={styles.claimButton}
              aria-label="Increase claim"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Status */}
        <div className={styles.itemStatus}>
          {totalClaimed === qty ? (
            <span className={styles.statusComplete}>All claimed</span>
          ) : (
            <span className={styles.statusRemaining}>
              {remaining} of {qty} left
            </span>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>
          {session.receipt.restaurant_name || 'Split Session'} | Split
        </title>
      </Head>

      {/* Header */}
      <header className={styles.sessionHeader}>
        <h1 className={styles.sessionTitle}>
          {session.receipt.restaurant_name || 'Split Session'}
        </h1>
        <p className={styles.welcomeText}>Hi, {currentUser}</p>
      </header>

      {/* Shareable link */}
      <div className={styles.shareBox}>
        <p className={styles.shareLabel}>Share with your group</p>
        <div className={styles.shareRow}>
          <input
            type="text"
            readOnly
            value={typeof window !== 'undefined' ? window.location.href : ''}
            className={styles.shareInput}
          />
          <button
            onClick={copyLink}
            className={`${styles.copyButton} ${copied ? styles.copyButtonCopied : ''}`}
          >
            {copied ? (
              <><Check size={14} /> Copied</>
            ) : (
              <><Copy size={14} /> Copy</>
            )}
          </button>
        </div>
      </div>

      {/* Participants */}
      <div className={styles.participantsBox}>
        <Users size={16} className={styles.participantsIcon} />
        <div className={styles.participantPills}>
          {session.participants.length > 0 ? (
            session.participants.map((name) => (
              <span
                key={name}
                className={`${styles.participantPill} ${name === currentUser ? styles.participantPillCurrent : ''}`}
              >
                {name}
              </span>
            ))
          ) : (
            <span className={styles.waitingText}>Waiting for friends...</span>
          )}
        </div>
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
          <p className={styles.hintText}>
            Tap items you ordered to claim them
          </p>

          <ul className={styles.itemsList}>
            {session.receipt.items.map((item, index) => {
              const itemQty = getItemQuantity(session, index);
              const itemPrice = getItemPrice(session, index);
              return renderItemCard(String(index), item.name, itemPrice, itemQty, false, index);
            })}

            {/* Custom items */}
            {session.customItems.map((item) => {
              const itemKey = `custom_${item.id}`;
              return renderItemCard(itemKey, item.name, item.price, item.quantity, true, item.id);
            })}
          </ul>

          {/* Totals info */}
          <div className={styles.totalsInfo}>
            <div className={styles.totalsRow}>
              <span className={styles.totalsLabel}>Subtotal</span>
              <span className={styles.totalsValue}>${session.receipt.subtotal?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className={styles.totalsRow}>
              <span className={styles.totalsLabel}>Tax</span>
              <span className={styles.totalsValue}>${session.receipt.tax?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className={styles.totalsRow}>
              <span className={styles.totalsLabel}>Tip</span>
              <span className={styles.totalsValue}>${session.receipt.tip?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className={`${styles.totalsRow} ${styles.totalsDivider}`}>
              <span className={styles.totalsBold}>Total</span>
              <span className={styles.totalsBold}>${session.receipt.total?.toFixed(2) || 'N/A'}</span>
            </div>
          </div>

          {/* Calculate button */}
          <div className={styles.calculateWrapper}>
            <button
              onClick={handleCalculate}
              disabled={!allItemsClaimed || calculating}
              className={styles.calculateButton}
            >
              {calculating ? (
                <>
                  <Loader2 size={20} className={styles.spinner} />
                  Calculating...
                </>
              ) : (
                <>
                  <Calculator size={20} />
                  Calculate Split
                </>
              )}
            </button>
            {!allItemsClaimed && (
              <p className={styles.calculateHint}>
                All items must be claimed first
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Results view */
        <div className={styles.resultsSection}>
          <h2 className={styles.resultsTitle}>Everyone&apos;s share</h2>
          <p className={styles.lockedText}>
            Items are locked. Here&apos;s what each person owes.
          </p>

          {session.splitResults && session.splitResults.map((person: PersonTotal) => (
            <div
              key={person.name}
              className={`${styles.personCard} ${person.name === currentUser ? styles.personCardCurrent : ''}`}
            >
              <div className={styles.personHeader}>
                <div className={styles.personLeft}>
                  <div className={`${styles.personAvatar} ${person.name === currentUser ? styles.personAvatarCurrent : ''}`}>
                    {person.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className={styles.personName}>{person.name}</span>
                    {person.name === currentUser && (
                      <span className={styles.youLabel}>(you)</span>
                    )}
                  </div>
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

          {/* Receipt totals */}
          <div className={styles.receiptTotals}>
            <p className={styles.receiptTotalsLabel}>Receipt totals</p>
            <div className={styles.totalsRow}>
              <span className={styles.totalsLabel}>Subtotal</span>
              <span className={styles.totalsValue}>${session.receipt.subtotal?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className={styles.totalsRow}>
              <span className={styles.totalsLabel}>Tax</span>
              <span className={styles.totalsValue}>${session.receipt.tax?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className={styles.totalsRow}>
              <span className={styles.totalsLabel}>Tip</span>
              <span className={styles.totalsValue}>${session.receipt.tip?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className={`${styles.totalsRow} ${styles.totalsDivider}`}>
              <span className={styles.totalsBold}>Total</span>
              <span className={styles.totalsBold}>${session.receipt.total?.toFixed(2) || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && sessionData && (
        <div className={styles.errorBox}>
          {error}
        </div>
      )}

      {/* Floating bottom bar - running total (only during claiming) */}
      {!session.isCalculated && (
        <div className={styles.floatingBar}>
          <div className={styles.floatingBarInner}>
            <div className={styles.floatingBarContent}>
              <span className={styles.floatingBarLabel}>Your total so far</span>
              <span className={styles.floatingBarTotal}>
                ${userRunningTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
