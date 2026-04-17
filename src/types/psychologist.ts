export interface Psychologist {
  id: string;
  name: string;
  title: string;
  specializations: string[];
  experience: number;
  rating: number;
  totalSessions: number;
  image: string;
  bio: string;
  languages: string[];
  availability: string[];
  calendlyLink: string;
  pricing: {
    [duration: number]: number;
  };
}

export interface BookingSession {
  duration: number;
  price: number;
  psychologistId: string;
}

// Individual pricing is now managed per psychologist in their pricing property