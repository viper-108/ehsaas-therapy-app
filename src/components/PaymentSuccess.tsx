import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Calendar, Clock, ExternalLink } from "lucide-react";
import { Psychologist } from "@/types/psychologist";

interface PaymentSuccessProps {
  psychologist: Psychologist;
  duration: number;
  amount: number;
  onClose: () => void;
}

export const PaymentSuccess = ({ psychologist, duration, amount, onClose }: PaymentSuccessProps) => {
  const handleScheduleSession = () => {
    window.open(psychologist.calendlyLink, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <Card className="max-w-md w-full p-6 bg-card animate-slide-up">
        <div className="text-center space-y-4">
          {/* Success Icon */}
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>

          {/* Success Message */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Payment Successful!</h2>
            <p className="text-muted-foreground text-sm">
              Your session has been booked successfully
            </p>
          </div>

          {/* Payment Details */}
          <Card className="p-4 bg-muted/30 text-left">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <img 
                    src={psychologist.image} 
                    alt={psychologist.name}
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `data:image/svg+xml,${encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                          <rect width="40" height="40" fill="hsl(210, 100%, 56%)" rx="20"/>
                          <text x="20" y="26" font-family="Arial" font-size="14" fill="white" text-anchor="middle">
                            ${psychologist.name.split(' ').map(n => n[0]).join('')}
                          </text>
                        </svg>
                      `)}`;
                    }}
                  />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{psychologist.name}</h3>
                  <p className="text-sm text-muted-foreground">{psychologist.title}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
                    <Clock className="w-3 h-3" />
                    Duration
                  </div>
                  <div className="font-medium text-foreground">{duration} minutes</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Amount Paid</div>
                  <div className="font-bold text-primary">₹{amount}</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Next Steps */}
          <div className="bg-primary/5 p-4 rounded-lg">
            <h4 className="font-medium text-foreground mb-2 text-sm">Next Step</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Schedule your session at a convenient time using Calendly
            </p>
            <Button 
              variant="trust"
              size="sm"
              onClick={handleScheduleSession}
              className="w-full"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Session
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </div>

          {/* Status Badge */}
          <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
            Session Confirmed
          </Badge>

          {/* Close Button */}
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full mt-4"
          >
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
};