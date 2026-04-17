import { useState } from "react";
import { Phone, X, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSettings } from "@/hooks/useSettings";

const DEFAULT_HELPLINES = [
  { name: "Vandrevala Foundation", number: "1860-2662-345", description: "24/7 Mental Health Helpline" },
  { name: "iCall", number: "9152987821", description: "Psychosocial Helpline" },
  { name: "AASRA", number: "9820466726", description: "Crisis Intervention" },
  { name: "Emergency Services", number: "112", description: "National Emergency Number" },
];

export const SOSButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { settings } = useSettings();
  const helplines = settings.crisisHelplines || DEFAULT_HELPLINES;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-destructive text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform animate-pulse hover:animate-none"
        title="Emergency Helplines"
      >
        <Phone className="w-6 h-6" />
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Crisis Helplines
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              If you or someone you know is in crisis, please reach out to these helplines immediately. They are available 24/7.
            </p>

            {helplines.map((h: any, i: number) => (
              <Card key={i} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{h.name}</p>
                    <p className="text-xs text-muted-foreground">{h.description}</p>
                  </div>
                  <a
                    href={`tel:${h.number.replace(/[-\s]/g, '')}`}
                    className="flex items-center gap-2 bg-destructive text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    {h.number}
                  </a>
                </div>
              </Card>
            ))}

            <p className="text-xs text-muted-foreground text-center mt-4">
              Remember: You are not alone. Help is always available.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
