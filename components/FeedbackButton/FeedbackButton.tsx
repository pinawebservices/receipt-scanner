import { useState } from 'react';
import { MessageCircle, X, Send, Check } from 'lucide-react';
import { track } from '@/lib/analytics';
import styles from './FeedbackButton.module.css';

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() }),
      });

      if (res.ok) {
        track('feedback_submitted');
        setSubmitted(true);
        setMessage('');
        setTimeout(() => {
          setOpen(false);
          setSubmitted(false);
        }, 2000);
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        className={styles.floatingButton}
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
      >
        <MessageCircle size={20} />
      </button>
    );
  }

  return (
    <div className={styles.feedbackCard}>
      {submitted ? (
        <div className={styles.thankYou}>
          <Check size={24} />
          <span className={styles.thankYouText}>Thanks for your feedback!</span>
        </div>
      ) : (
        <>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Send feedback</span>
            <button
              className={styles.closeButton}
              onClick={() => setOpen(false)}
              aria-label="Close feedback"
            >
              <X size={16} />
            </button>
          </div>
          <textarea
            className={styles.textarea}
            placeholder="What could be better?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={1000}
          />
          <button
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={!message.trim() || submitting}
          >
            <Send size={14} />
            {submitting ? 'Sending...' : 'Submit'}
          </button>
        </>
      )}
    </div>
  );
}
