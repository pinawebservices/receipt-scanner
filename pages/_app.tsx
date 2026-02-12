import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { DM_Sans } from 'next/font/google';
import { initAnalytics } from '@/lib/analytics';
import FeedbackButton from '@/components/FeedbackButton/FeedbackButton';
import '@/styles/globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
});

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <div className={`${dmSans.variable} ${dmSans.className}`}>
      <Component {...pageProps} />
      <FeedbackButton />
    </div>
  );
}
