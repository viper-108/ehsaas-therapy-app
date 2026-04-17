import { useState } from "react";
import { Star, Languages, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PsychologistCard } from "@/components/PsychologistCard";
import { BookingModal } from "@/components/BookingModal";
import { PaymentSuccess } from "@/components/PaymentSuccess";
import { psychologists } from "@/data/psychologists";
import { Psychologist, BookingSession } from "@/types/psychologist";
import Navigation from "@/components/Navigation";
import { useNavigate } from "react-router-dom";

const Team = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>("");
  const [selectedPsychologist, setSelectedPsychologist] = useState<Psychologist | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<BookingSession | null>(null);

  // Get unique specializations for filter
  const allSpecializations = Array.from(
    new Set(psychologists.flatMap(p => p.specializations))
  );

  // Filter psychologists based on search and specialization
  const filteredPsychologists = psychologists.filter(psychologist => {
    const matchesSearch = psychologist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         psychologist.specializations.some(spec => 
                           spec.toLowerCase().includes(searchTerm.toLowerCase())
                         );
    const matchesSpecialization = !selectedSpecialization || 
                                 psychologist.specializations.includes(selectedSpecialization);
    return matchesSearch && matchesSpecialization;
  });

  const handleViewProfile = (id: string) => {
    navigate(`/psychologist/${id}`);
  };

  const handleBookNow = (psychologist: Psychologist) => {
    setSelectedPsychologist(psychologist);
    setShowBookingModal(true);
  };

  const handleBookingConfirm = (duration: number, amount: number) => {
    const bookingData: BookingSession = {
      duration,
      price: amount,
      psychologistId: selectedPsychologist!.id
    };
    setBookingDetails(bookingData);
    setShowBookingModal(false);
    setShowPaymentSuccess(true);
  };

  const handleClosePaymentSuccess = () => {
    setShowPaymentSuccess(false);
    setSelectedPsychologist(null);
    setBookingDetails(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-foreground mb-6">Our Expert Team</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Meet our team of empathetic, experienced psychologists who are here to support your mental health journey
            </p>
          </div>

          {/* Search and Filters */}
          <div className="mb-12">
            <Card className="p-6">
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Input
                    placeholder="Search by name or specialization..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* Specialization Filter */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedSpecialization === "" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSpecialization("")}
                  >
                    All Specializations
                  </Button>
                  {allSpecializations.slice(0, 6).map((spec) => (
                    <Button
                      key={spec}
                      variant={selectedSpecialization === spec ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedSpecialization(spec)}
                    >
                      {spec}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Team Results */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Available Psychologists ({filteredPsychologists.length})
            </h2>
            <p className="text-muted-foreground">
              Our psychologists offer sessions with flexible pricing based on their expertise
            </p>
          </div>

          {/* Team Grid */}
          {filteredPsychologists.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="text-muted-foreground">
                <h3 className="font-medium mb-2">No psychologists found</h3>
                <p className="text-sm">Try adjusting your search or filter criteria</p>
              </div>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-2 gap-6">
              {filteredPsychologists.map((psychologist) => (
                <Card key={psychologist.id} className="p-6 hover:shadow-large transition-all duration-300">
                  <div className="flex gap-6">
                    {/* Image */}
                    <div className="flex-shrink-0">
                      <div className="w-24 h-24 rounded-lg bg-gradient-primary flex items-center justify-center overflow-hidden">
                        <img 
                          src={psychologist.image} 
                          alt={psychologist.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML = `
                              <svg class="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                              </svg>
                            `;
                          }}
                        />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-semibold text-foreground">{psychologist.name}</h3>
                          <p className="text-sm text-muted-foreground">{psychologist.title}</p>
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{psychologist.rating}</span>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {psychologist.bio}
                      </p>

                      {/* Specializations */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {psychologist.specializations.slice(0, 3).map((spec) => (
                          <Badge key={spec} variant="secondary" className="text-xs">
                            {spec}
                          </Badge>
                        ))}
                      </div>

                      {/* Languages */}
                      <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                        <Languages className="w-4 h-4" />
                        <span>{psychologist.languages.join(", ")}</span>
                      </div>

                      {/* Experience & Sessions */}
                      <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{psychologist.experience} years exp</span>
                        </div>
                        <span>•</span>
                        <span>{psychologist.totalSessions}+ sessions</span>
                      </div>

                      {/* Pricing */}
                      <div className="flex items-center gap-2 mb-4 text-sm">
                        {Object.entries(psychologist.pricing).map(([duration, price]) => (
                          <span key={duration} className="bg-primary/10 text-primary px-2 py-1 rounded">
                            ₹{price}/{duration}min
                          </span>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleViewProfile(psychologist.id)}
                          variant="outline" 
                          size="sm"
                          className="flex-1"
                        >
                          View Profile
                        </Button>
                        <Button 
                          onClick={() => handleBookNow(psychologist)}
                          size="sm"
                          className="flex-1"
                        >
                          Book Now
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {selectedPsychologist && (
        <BookingModal
          psychologist={selectedPsychologist}
          isOpen={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          onBookingConfirm={handleBookingConfirm}
        />
      )}

      {bookingDetails && selectedPsychologist && showPaymentSuccess && (
        <PaymentSuccess
          psychologist={selectedPsychologist}
          duration={bookingDetails.duration}
          amount={bookingDetails.price}
          onClose={handleClosePaymentSuccess}
        />
      )}
    </div>
  );
};

export default Team;