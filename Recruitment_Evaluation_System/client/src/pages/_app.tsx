import type { AppProps } from 'next/app';
import { useEffect } from 'react';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Make NEXT_PUBLIC_API_URL available at runtime for debugging
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) {
      (window as any).__NEXT_PUBLIC_API_URL__ = process.env.NEXT_PUBLIC_API_URL;
      console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
    }
  }, []);
  
  return <Component {...pageProps} />;
}

