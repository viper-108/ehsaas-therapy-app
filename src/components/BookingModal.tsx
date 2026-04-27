import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Clock, Star, Calendar, CreditCard, CheckCircle, Loader2, Repeat } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Psychologist } from "@/types/psychologist";
import { WaitlistButton } from "@/components/WaitlistButton";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface BookingModalProps {
  psychologist: Psychologist | null;
  isOpen: boolean;
  onClose: () => void;
  onBookingConfirm: (duration: number, amount: number) => void;
}

export const BookingModal = ({ psychologist, isOpen, onClose, onBookingConfirm }: BookingModalProps) => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const availableDurations = psychologist ? Object.keys(psychologist.pricing).map(Number).sort() : [];
  const [selectedDuration, setSelectedDuration] = useState<number>(availableDurations[0] || 30);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [mongoTherapistId, setMongoTherapistId] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (isOpen) {
      setSelectedDuration(availableDurations[0] || 30);
      setSelectedDate('');
      setSelectedTime('');
      setAvailableSlots([]);
      setBookingSuccess(false);
      setMongoTherapistId(null);

      // Try to find this therapist in MongoDB by name
      if (psychologist && user && role === 'client') {
        api.getTherapists({ search: psychologist.name })
          .then(therapists => {
            const match = therapists.find((t: any) => t.name === psychologist.name);
            if (match) {
              setMongoTherapistId(match._id);
            }
          })
          .catch(() => {});
      }
    }
  }, [isOpen, psychologist]);

  // Load available slots when date changes
  useEffect(() => {
    if (!selectedDate || !mongoTherapistId) return;

    setLoadingSlots(true);
    setSelectedTime('');
    api.getAvailableSlots(mongoTherapistId, selectedDate)
      .then(data => {
        setAvailableSlots(data.slots || []);
      })
      .catch(() => {
        setAvailableSlots([]);
      })
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, mongoTherapistId]);

  if (!psychologist) return null;

  const isLoggedInClient = user && role === 'client';

  const handlePayment = async () => {
    // If client is logged in AND we have a mongo therapist match, do real booking
    if (isLoggedInClient && mongoTherapistId) {
      if (!selectedDate || !selectedTime) {
        toast({ title: "Select date & time", description: "Please pick a date and time slot for your session", variant: "destructive" });
        return;
      }

      setBooking(true);
      try {
        let session;

        if (isRecurring) {
          // Book 4 weekly recurring sessions
          const result = await api.bookRecurring({
            therapistId: mongoTherapistId,
            date: selectedDate,
            startTime: selectedTime,
            duration: selectedDuration,
            sessionType: 'individual',
            weeks: 4,
          });
          session = result.sessions[0]; // use first session for payment
          toast({ title: "Recurring Sessions Created", description: `${result.sessions.length} weekly sessions booked!` });
        } else {
          // Single session
          session = await api.bookSession({
            therapistId: mongoTherapistId,
            date: selectedDate,
            startTime: selectedTime,
            duration: selectedDuration,
            sessionType: 'individual',
          });
        }

        // 2. Create PhonePe checkout — use total amount for recurring
        const totalAmount = isRecurring
          ? psychologist.pricing[selectedDuration] * 4
          : psychologist.pricing[selectedDuration];
        try {
          const checkout = await api.createCheckout({
            sessionId: session._id,
            therapistId: mongoTherapistId,
            amount: totalAmount,
            duration: selectedDuration,
            isRecurring: isRecurring || false,
            recurringGroupId: isRecurring ? session.recurringGroupId : undefined,
          });

          if (checkout.url) {
            window.location.href = checkout.url;
          } else {
            toast({ title: "Payment Error", description: "Could not create payment session. Please try again.", variant: "destructive" });
          }
        } catch (paymentError: any) {
          toast({ title: "Payment Error", description: paymentError.message || "Payment initiation failed. Please try again.", variant: "destructive" });
        }
      } catch (error: any) {
        toast({ title: "Booking Failed", description: error.message, variant: "destructive" });
      } finally {
        setBooking(false);
      }
    } else {
      // Fallback: original behavior (no backend, just show success popup)
      const amount = psychologist.pricing[selectedDuration];
      onBookingConfirm(selectedDuration, amount);
    }
  };

  if (bookingSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={() => { setBookingSuccess(false); onClose(); }}>
        <DialogContent className="sm:max-w-md mx-4">
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Session Booked!</h2>
            <p className="text-muted-foreground text-sm">
              Your session with <strong>{psychologist.name}</strong> is confirmed.
            </p>
            <Card className="p-4 bg-muted/30 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Date</div>
                  <div className="font-medium text-foreground">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Time</div>
                  <div className="font-medium text-foreground">{selectedTime}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Duration</div>
                  <div className="font-medium text-foreground">{selectedDuration} min</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Amount</div>
                  <div className="font-bold text-primary">₹{psychologist.pricing[selectedDuration]}</div>
                </div>
              </div>
            </Card>
            <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
              Session Confirmed
            </Badge>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setBookingSuccess(false); onClose(); }}>
                Close
              </Button>
              <Button className="flex-1" onClick={() => { setBookingSuccess(false); onClose(); window.location.href = '/client-dashboard'; }}>
                Go to Dashboard
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-4 animate-slide-up max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Book Session</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Psychologist Info */}
          <Card className="p-4 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <img
                  src={psychologist.image}
                  alt={psychologist.name}
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `data:image/svg+xml,${encodeURIComponent(`
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
                        <rect width="48" height="48" fill="hsl(210, 100%, 56%)" rx="24"/>
                        <text x="24" y="30" font-family="Arial" font-size="16" fill="white" text-anchor="middle">
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
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-3 h-3 fill-warm text-warm" />
                  <span className="text-xs text-muted-foreground">{psychologist.rating}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Session Duration Selection */}
          <div>
            <h4 className="font-medium mb-3 text-foreground">Choose Session Duration</h4>
            <div className="grid grid-cols-2 gap-3">
              {availableDurations.map((duration) => (
                <Card
                  key={duration}
                  className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-medium ${
                    selectedDuration === duration
                      ? 'ring-2 ring-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedDuration(duration)}
                >
                  <div className="text-center">
                    <Clock className="w-5 h-5 mx-auto mb-2 text-primary" />
                    <div className="font-semibold text-foreground">{duration} Minutes</div>
                    <div className="text-lg font-bold text-primary mt-1">₹{psychologist.pricing[duration]}</div>
                    <div className="text-xs text-muted-foreground">
                      {duration <= 30 ? 'Quick consultation' : 'In-depth session'}
                    </div>
                    {duration >= 50 && <Badge variant="secondary" className="mt-1 text-xs">Popular</Badge>}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Date & Time Selection (only for logged-in clients) */}
          {isLoggedInClient && mongoTherapistId && (
            <div className="space-y-3">
              <div>
                <h4 className="font-medium mb-2 text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Select Date
                </h4>
                <Input
                  type="date"
                  min={today}
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full"
                />
              </div>

              {selectedDate && (
                <div>
                  <h4 className="font-medium mb-2 text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Select Time
                  </h4>
                  {loadingSlots ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <span className="ml-2 text-sm text-muted-foreground">Loading available slots...</span>
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div>
                      <p className="text-sm text-muted-foreground py-2 mb-2">No available slots on this date.</p>
                      {mongoTherapistId && selectedDate && (
                        <WaitlistButton therapistId={mongoTherapistId} date={selectedDate} therapistName={psychologist.name} />
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.map(slot => (
                        <Button
                          key={slot.time}
                          variant={selectedTime === slot.time ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedTime(slot.time)}
                          className="text-sm"
                        >
                          {slot.time}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Recurring Toggle */}
          {isLoggedInClient && mongoTherapistId && selectedTime && (
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Make this recurring</p>
                  <p className="text-xs text-muted-foreground">Book weekly for 4 weeks at the same time</p>
                </div>
              </div>
              <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
            </div>
          )}

          {/* Not logged in notice */}
          {!isLoggedInClient && (
            <Card className="p-3 bg-primary/5 border-primary/20">
              <p className="text-xs text-primary text-center">
                💡 Log in as a client to book directly with date & time selection.
                Or proceed to schedule via Calendly after payment.
              </p>
            </Card>
          )}

          {/* Summary */}
          <Card className="p-4 bg-muted/30">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Session Duration:</span>
              <span className="font-medium text-foreground">{selectedDuration} minutes</span>
            </div>
            {isLoggedInClient && selectedDate && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Date & Time:</span>
                <span className="font-medium text-foreground">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  {selectedTime && ` at ${selectedTime}`}
                </span>
              </div>
            )}
            {isRecurring ? (
              <>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-muted-foreground">Per session:</span>
                  <span className="text-sm font-medium">₹{psychologist.pricing[selectedDuration]}</span>
                </div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-muted-foreground">Sessions:</span>
                  <span className="text-sm font-medium">4 weekly sessions</span>
                </div>
                <div className="flex justify-between items-center mb-3 pt-2 border-t">
                  <span className="text-sm text-muted-foreground font-medium">Total Amount:</span>
                  <span className="text-lg font-bold text-primary">₹{psychologist.pricing[selectedDuration] * 4}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-muted-foreground">Amount:</span>
                <span className="text-lg font-bold text-primary">₹{psychologist.pricing[selectedDuration]}</span>
              </div>
            )}
            {!isLoggedInClient && (
              <div className="border-t pt-2">
                <p className="text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  You can schedule the session after payment via Calendly
                </p>
              </div>
            )}
          </Card>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full"
            >
              Cancel
            </Button>
            <Button
              variant="payment"
              onClick={handlePayment}
              className="w-full"
              disabled={booking || (isLoggedInClient && mongoTherapistId ? (!selectedDate || !selectedTime) : false)}
            >
              {booking ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Booking...</>
              ) : (
                <><CreditCard className="w-4 h-4 mr-2" /> Pay ₹{psychologist.pricing[selectedDuration]}</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
