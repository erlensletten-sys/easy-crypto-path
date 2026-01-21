import { useState, useEffect, useCallback } from 'react';

export type TransactionStatus = 'idle' | 'pending' | 'confirming' | 'confirmed' | 'failed';

interface TransactionState {
  status: TransactionStatus;
  confirmations: number;
  requiredConfirmations: number;
  txHash?: string;
  error?: string;
}

// Required confirmations by cryptocurrency
// TODO: Replace with actual node requirements
const REQUIRED_CONFIRMATIONS: Record<string, number> = {
  btc: 3,
  eth: 12,
  sol: 32,
  xmr: 10,
  usdt: 12,
};

/**
 * Hook for tracking transaction confirmations
 * 
 * TODO: Backend Integration Points
 * - Replace mockCheckConfirmations with actual node RPC call
 * - GET /api/transactions/{txHash}/confirmations
 * - WebSocket /ws/transactions/{txHash} for real-time updates
 */
export function useTransactionConfirmation(cryptoId: string = 'eth') {
  const [state, setState] = useState<TransactionState>({
    status: 'idle',
    confirmations: 0,
    requiredConfirmations: REQUIRED_CONFIRMATIONS[cryptoId] || 12,
  });

  const [isPolling, setIsPolling] = useState(false);

  // Mock function to simulate checking confirmations from a node
  // TODO: Replace with actual API call to your node
  const mockCheckConfirmations = useCallback(async (txHash: string): Promise<number> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // TODO: Replace with actual node RPC call
    // Example: const response = await fetch(`/api/node/tx/${txHash}/confirmations`);
    // return response.json().confirmations;
    
    // For demo: increment confirmations randomly
    return state.confirmations + (Math.random() > 0.3 ? 1 : 0);
  }, [state.confirmations]);

  // Start checking for payment
  const startConfirmation = useCallback((txHash?: string) => {
    const hash = txHash || `0x${Math.random().toString(16).slice(2, 10)}...mock`;
    setState(prev => ({
      ...prev,
      status: 'pending',
      confirmations: 0,
      txHash: hash,
      error: undefined,
    }));
    setIsPolling(true);
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setState({
      status: 'idle',
      confirmations: 0,
      requiredConfirmations: REQUIRED_CONFIRMATIONS[cryptoId] || 12,
    });
    setIsPolling(false);
  }, [cryptoId]);

  // Polling effect
  useEffect(() => {
    if (!isPolling || !state.txHash) return;

    const pollInterval = setInterval(async () => {
      try {
        const newConfirmations = await mockCheckConfirmations(state.txHash!);
        
        setState(prev => {
          const updated = { ...prev, confirmations: newConfirmations };
          
          if (newConfirmations > 0 && prev.status === 'pending') {
            updated.status = 'confirming';
          }
          
          if (newConfirmations >= prev.requiredConfirmations) {
            updated.status = 'confirmed';
            setIsPolling(false);
          }
          
          return updated;
        });
      } catch (error) {
        setState(prev => ({
          ...prev,
          status: 'failed',
          error: 'Failed to check transaction status',
        }));
        setIsPolling(false);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [isPolling, state.txHash, mockCheckConfirmations]);

  // Update required confirmations when crypto changes
  useEffect(() => {
    setState(prev => ({
      ...prev,
      requiredConfirmations: REQUIRED_CONFIRMATIONS[cryptoId] || 12,
    }));
  }, [cryptoId]);

  return {
    ...state,
    isPolling,
    startConfirmation,
    reset,
    progress: state.requiredConfirmations > 0 
      ? (state.confirmations / state.requiredConfirmations) * 100 
      : 0,
  };
}
