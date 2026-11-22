'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { backend } from '@/lib/backend';
import { useAuth } from '@/context/AuthContext';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSessionUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function handleExchange() {
      const code = searchParams.get('code');
      const err = searchParams.get('error');

      if (err) {
        if (active) {
          setStatus('error');
          setErrorMessage(`Google sign-in was cancelled or denied: ${err}`);
        }
        return;
      }

      if (!code) {
        if (active) {
          setStatus('error');
          setErrorMessage('No authentication code was received from Google redirect.');
        }
        return;
      }

      try {
        const res = await backend.exchangeGoogleCode(code);
        if (active && res && res.token) {
          setSessionUser(res.token, {
            id: res.customer_id,
            name: res.name,
            email: res.email || '',
          });
          setStatus('success');
          setTimeout(() => {
            router.push('/profile');
          }, 1200);
        } else {
          throw new Error('Exchange failed to return a valid session.');
        }
      } catch (e: any) {
        if (active) {
          setStatus('error');
          setErrorMessage(e.message || 'Failed to exchange login code with StockSure backend.');
        }
      }
    }

    handleExchange();

    return () => {
      active = false;
    };
  }, [searchParams, router, setSessionUser]);

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-[24px] bg-white/90 backdrop-blur-md border border-forest/15 shadow-elevated text-center space-y-4">
        {status === 'loading' && (
          <>
            <Loader2 className="w-10 h-10 text-forest animate-spin mx-auto" />
            <h2 className="editorial-serif text-2xl font-light text-forest">
              Signing into StockSure
            </h2>
            <p className="text-xs text-darktext/70">
              Securing session and establishing your nursery connection...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h2 className="editorial-serif text-2xl font-light text-forest">
              Welcome to StockSure!
            </h2>
            <p className="text-xs text-darktext/70">
              Google authentication successful. Redirecting to your sanctuary profile...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
            <h2 className="editorial-serif text-2xl font-light text-forest">
              Sign-In Failed
            </h2>
            <p className="text-xs text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">
              {errorMessage}
            </p>
            <div className="pt-2">
              <a
                href="/"
                className="inline-block px-5 py-2.5 rounded-button bg-forest text-cream text-xs font-semibold hover:bg-forest-700 transition-colors"
              >
                Return to Storefront
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-forest animate-spin" />
      </div>
    }>
      <GoogleCallbackContent />
    </Suspense>
  );
}
