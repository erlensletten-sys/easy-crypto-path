import { CheckCircle2, Loader2, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useTransactionConfirmation, type TransactionStatus } from '@/hooks/useTransactionConfirmation';
import { cn } from '@/lib/utils';

interface ConfirmPaymentButtonProps {
  cryptoId: string;
  onConfirmed?: () => void;
}

const statusConfig: Record<TransactionStatus, { 
  icon: React.ReactNode; 
  label: string; 
  className: string;
}> = {
  idle: {
    icon: <Clock size={18} />,
    label: 'Confirm payment',
    className: 'bg-primary hover:bg-primary/90',
  },
  pending: {
    icon: <Loader2 size={18} className="animate-spin" />,
    label: 'Waiting for transaction...',
    className: 'bg-amber-500 hover:bg-amber-500/90',
  },
  confirming: {
    icon: <Loader2 size={18} className="animate-spin" />,
    label: 'Confirming...',
    className: 'bg-blue-500 hover:bg-blue-500/90',
  },
  confirmed: {
    icon: <CheckCircle2 size={18} />,
    label: 'Payment confirmed!',
    className: 'bg-green-500 hover:bg-green-500/90',
  },
  failed: {
    icon: <AlertCircle size={18} />,
    label: 'Confirmation failed',
    className: 'bg-destructive hover:bg-destructive/90',
  },
};

const ConfirmPaymentButton = ({ cryptoId, onConfirmed }: ConfirmPaymentButtonProps) => {
  const {
    status,
    confirmations,
    requiredConfirmations,
    progress,
    isPolling,
    startConfirmation,
    reset,
  } = useTransactionConfirmation(cryptoId);

  const config = statusConfig[status];

  const handleClick = () => {
    if (status === 'idle' || status === 'failed') {
      startConfirmation();
    } else if (status === 'confirmed') {
      onConfirmed?.();
      reset();
    }
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={handleClick}
        disabled={status === 'pending' || status === 'confirming'}
        className={cn(
          'w-full h-12 text-sm font-medium transition-all duration-300',
          config.className
        )}
      >
        <span className="flex items-center gap-2">
          {config.icon}
          {config.label}
        </span>
      </Button>

      {(status === 'confirming' || status === 'confirmed') && (
        <div className="space-y-2 animate-fade-in">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Confirmations</span>
            <span className={cn(
              'font-medium',
              status === 'confirmed' ? 'text-green-500' : 'text-foreground'
            )}>
              {confirmations}/{requiredConfirmations}
            </span>
          </div>
          <Progress 
            value={progress} 
            className={cn(
              'h-2 transition-all',
              status === 'confirmed' && '[&>div]:bg-green-500'
            )}
          />
          {status === 'confirming' && (
            <p className="text-[10px] text-muted-foreground text-center">
              Checking blockchain for confirmations...
            </p>
          )}
        </div>
      )}

      {status === 'pending' && (
        <p className="text-xs text-muted-foreground text-center animate-pulse">
          Scanning for incoming transaction...
        </p>
      )}

      {status === 'failed' && (
        <p className="text-xs text-destructive text-center">
          Click to retry confirmation check
        </p>
      )}
    </div>
  );
};

export default ConfirmPaymentButton;
