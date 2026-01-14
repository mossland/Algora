'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import {
  TokenHolder,
  fetchTokenHolder,
  requestWalletVerification,
  confirmWalletVerification,
  refreshTokenBalance,
} from '@/lib/api';

interface WalletContextType {
  // State
  holder: TokenHolder | null;
  isVerified: boolean;
  isLoading: boolean;
  error: string | null;

  // Verification
  verificationMessage: string | null;
  verificationNonce: string | null;
  isVerifying: boolean;

  // Actions
  startVerification: () => Promise<string>;
  completeVerification: (signature: string) => Promise<void>;
  refreshHolder: () => Promise<void>;
  clearError: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();

  // State
  const [holder, setHolder] = useState<TokenHolder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verification state
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [verificationNonce, setVerificationNonce] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Derived state
  const isVerified = holder?.isVerified ?? false;

  // Fetch holder info when wallet connects
  const fetchHolder = useCallback(async () => {
    if (!address) {
      setHolder(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const holderData = await fetchTokenHolder(address);
      setHolder(holderData);
    } catch (err) {
      console.error('Failed to fetch holder:', err);
      setHolder(null);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Fetch holder when address changes
  useEffect(() => {
    if (isConnected && address) {
      fetchHolder();
    } else {
      setHolder(null);
      setVerificationMessage(null);
      setVerificationNonce(null);
    }
  }, [isConnected, address, fetchHolder]);

  // Start verification process
  const startVerification = useCallback(async (): Promise<string> => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    setIsVerifying(true);
    setError(null);

    try {
      const { message, nonce } = await requestWalletVerification(address);
      setVerificationMessage(message);
      setVerificationNonce(nonce);
      return message;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start verification';
      setError(errorMessage);
      throw err;
    } finally {
      setIsVerifying(false);
    }
  }, [address]);

  // Complete verification with signature
  const completeVerification = useCallback(
    async (signature: string): Promise<void> => {
      if (!address || !verificationNonce) {
        throw new Error('Verification not started');
      }

      setIsVerifying(true);
      setError(null);

      try {
        const verifiedHolder = await confirmWalletVerification(
          address,
          signature,
          verificationNonce
        );
        setHolder(verifiedHolder);
        setVerificationMessage(null);
        setVerificationNonce(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Verification failed';
        setError(errorMessage);
        throw err;
      } finally {
        setIsVerifying(false);
      }
    },
    [address, verificationNonce]
  );

  // Refresh holder balance
  const refreshHolder = useCallback(async (): Promise<void> => {
    if (!holder?.id) {
      await fetchHolder();
      return;
    }

    setIsLoading(true);
    try {
      const updatedHolder = await refreshTokenBalance(holder.id);
      setHolder(updatedHolder);
    } catch (err) {
      console.error('Failed to refresh balance:', err);
      setError('Failed to refresh balance');
    } finally {
      setIsLoading(false);
    }
  }, [holder?.id, fetchHolder]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: WalletContextType = {
    holder,
    isVerified,
    isLoading,
    error,
    verificationMessage,
    verificationNonce,
    isVerifying,
    startVerification,
    completeVerification,
    refreshHolder,
    clearError,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWalletContext(): WalletContextType {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  return context;
}
