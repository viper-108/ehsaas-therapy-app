import { Star, Clock, MessageCircle, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Psychologist } from "@/types/psychologist";

interface PsychologistCardProps {
  psychologist: Psychologist;
  onViewProfile: (id: string) => void;
}

export const PsychologistCard = ({ psychologist, onViewProfile }: PsychologistCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-medium transition-all duration-300 hover:scale-[1.02] bg-card border-border animate-fade-in">
      <div className="p-4">
        {/* Header with image and basic info */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
            <img 
              src={psychologist.image} 
              alt={psychologist.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `data:image/svg+xml,${encodeURIComponent(`
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
                    <rect width="64" height="64" fill="hsl(210, 100%, 56%)"/>
                    <text x="32" y="40" font-family="Arial" font-size="24" fill="white" text-anchor="middle">
                      ${psychologist.name.split(' ').map(n => n[0]).join('')}
                    </text>
                  </svg>
                `)}`;
              }}
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-base mb-1 truncate">
              {psychologist.name}
            </h3>
            <p className="text-muted-foreground text-sm mb-2">
              {psychologist.title}
            </p>
            
            {/* Rating and experience */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-warm text-warm" />
                <span className="font-medium">{psychologist.rating}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{psychologist.experience}y exp</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                <span>{psychologist.totalSessions}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Specializations */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {psychologist.specializations.slice(0, 3).map((spec, index) => (
              <Badge 
                key={index}
                variant="secondary"
                className="text-xs px-2 py-1 bg-secondary/50 text-secondary-foreground"
              >
                {spec}
              </Badge>
            ))}
            {psychologist.specializations.length > 3 && (
              <Badge variant="outline" className="text-xs px-2 py-1">
                +{psychologist.specializations.length - 3}
              </Badge>
            )}
          </div>
        </div>

        {/* Pricing */}
        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
          <div className={`flex ${Object.keys(psychologist.pricing).length === 1 ? 'justify-center' : 'justify-between'} items-center text-sm gap-4`}>
            {Object.entries(psychologist.pricing).map(([duration, price], index, array) => (
              <div key={duration} className="text-center">
                <div className="font-semibold text-primary">₹{price}</div>
                <div className="text-muted-foreground text-xs">{duration} min</div>
                {index < array.length - 1 && array.length > 1 && (
                  <div className="w-px h-8 bg-border absolute right-0 top-0"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Languages */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-1">Languages:</p>
          <p className="text-xs text-foreground">{psychologist.languages.join(", ")}</p>
        </div>

        {/* View Profile Button */}
        <Button 
          variant="trust"
          size="sm"
          className="w-full"
          onClick={() => onViewProfile(psychologist.id)}
        >
          View Profile & Book
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
};