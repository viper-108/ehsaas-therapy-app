import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, Heart, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PsychologistCard } from "@/components/PsychologistCard";
import { psychologists } from "@/data/psychologists";

const Index = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>("");

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-hero">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center text-white space-y-4">
            <h1 className="text-3xl font-bold">ehsaas</h1>
            <p className="text-white/90 text-lg">Find the right psychologist for your mental wellness journey</p>
            
            {/* Stats */}
            <div className="flex justify-center gap-6 mt-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{psychologists.length}+</div>
                <div className="text-white/80 text-sm">Psychologists</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">4.8</div>
                <div className="text-white/80 text-sm flex items-center gap-1 justify-center">
                  <Star className="w-3 h-3 fill-current" />
                  Average Rating
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">10k+</div>
                <div className="text-white/80 text-sm">Sessions</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="max-w-2xl mx-auto px-4 -mt-6 relative z-10">
        <Card className="p-4 shadow-large bg-card">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by name or specialization..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Specialization Filter */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedSpecialization === "" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedSpecialization("")}
              >
                All
              </Button>
              {allSpecializations.slice(0, 4).map((spec) => (
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

      {/* Psychologists List */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Available Psychologists ({filteredPsychologists.length})
          </h2>
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm("")}
            >
              Clear
            </Button>
          )}
        </div>

        {filteredPsychologists.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-medium mb-2">No psychologists found</h3>
              <p className="text-sm">Try adjusting your search or filter criteria</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPsychologists.map((psychologist) => (
              <PsychologistCard
                key={psychologist.id}
                psychologist={psychologist}
                onViewProfile={handleViewProfile}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-muted/30 mt-12 py-8">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h3 className="font-semibold text-foreground mb-2">ehsaas</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Your mental wellness is our priority. Professional, confidential, and accessible therapy.
          </p>
          <div className="flex justify-center gap-4 text-xs text-muted-foreground">
            <span>• 100% Confidential</span>
            <span>• Licensed Professionals</span>
            <span>• Flexible Scheduling</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
