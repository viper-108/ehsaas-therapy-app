import { Card } from "@/components/ui/card";
import { ClipboardCheck } from "lucide-react";
import { MyServicesPanel } from "@/components/MyServicesPanel";
import { ManageServicesPanel } from "@/components/ManageServicesPanel";
import { PriceNegotiationsPanel } from "@/components/PriceNegotiationsPanel";

/**
 * Therapist's "Approvals" tab — collects everything that needs the therapist's
 * attention or admin's pending decision:
 *  - Admin-finalized services awaiting therapist accept/reject
 *  - Pending service-change requests they've submitted
 *  - Sliding-scale (price negotiation) approvals — moved here from Earnings
 */
export function TherapistApprovalsTab() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-primary" /> Approvals
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Review services admin finalized for you, propose new services, and respond to client price-negotiation requests.
        </p>
      </div>

      <MyServicesPanel />
      <ManageServicesPanel />

      <Card className="p-5">
        <PriceNegotiationsPanel role="therapist" />
      </Card>
    </div>
  );
}
