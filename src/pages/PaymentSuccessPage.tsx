import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, Loader2, XCircle, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { api } from "@/services/api";

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'pending' | 'error'>('loading');

  useEffect(() => {
    const confirmPayment = async () => {
      const paymentId = searchParams.get('paymentId');
      const transactionId = searchParams.get('transactionId');

      if (!paymentId || !transactionId) {
        setStatus('error');
        return;
      }

      try {
        const result = await api.confirmPayment(paymentId, transactionId);
        if (result.status === 'completed' || result.status === 'already_completed') {
          setStatus('success');
        } else if (result.status === 'pending') {
          setStatus('pending');
          // Retry after 3 seconds for pending payments
          setTimeout(async () => {
            try {
              const retry = await api.confirmPayment(paymentId, transactionId);
              if (retry.status === 'completed' || retry.status === 'already_completed') {
                setStatus('success');
              }
            } catch {
              // stay on pending
            }
          }, 3000);
        } else {
          setStatus('error');
        }
      } catch {
        setStatus('error');
      }
    };

    confirmPayment();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="flex items-center justify-center py-20">
        <Card className="max-w-md w-full p-8 text-center mx-4">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground">Confirming your payment...</h2>
              <p className="text-sm text-muted-foreground mt-2">Please wait while we verify with PhonePe</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Payment Successful!</h2>
              <p className="text-muted-foreground mb-6">
                Your session has been booked and confirmed. You can view your upcoming sessions in your dashboard.
              </p>
              <div className="flex flex-col gap-3">
                <Button onClick={() => navigate('/client-dashboard')} size="lg">
                  Go to Dashboard
                </Button>
                <Button variant="outline" onClick={() => navigate('/team')}>
                  Book Another Session
                </Button>
              </div>
            </>
          )}
          {status === 'pending' && (
            <>
              <div className="w-16 h-16 bg-warm/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-warm" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Payment Processing...</h2>
              <p className="text-muted-foreground mb-6">
                Your payment is being processed. This may take a moment. Your session will be confirmed once payment completes.
              </p>
              <div className="flex flex-col gap-3">
                <Button onClick={() => navigate('/client-dashboard')} size="lg">
                  Go to Dashboard
                </Button>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Check Again
                </Button>
              </div>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold text-destructive mb-2">Payment Failed</h2>
              <p className="text-muted-foreground mb-6">
                There was an issue with your payment. Please try booking again or contact support.
              </p>
              <div className="flex flex-col gap-3">
                <Button onClick={() => navigate('/team')} size="lg">
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => navigate('/')}>
                  Go Home
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
