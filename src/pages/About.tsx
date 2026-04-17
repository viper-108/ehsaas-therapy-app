import { Heart, Target, Eye, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Navigation from "@/components/Navigation";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-foreground mb-6">About EHSAAS</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Dedicated to providing compassionate, professional mental health care that empowers individuals to heal and thrive.
            </p>
          </div>

          {/* About EHSAAS */}
          <div className="mb-20">
            <Card className="p-8">
              <CardContent className="pt-6">
                <div className="flex items-center mb-6">
                  <Heart className="w-8 h-8 text-primary mr-4" />
                  <h2 className="text-3xl font-bold text-foreground">About EHSAAS</h2>
                </div>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                 At Ehsaas Therapy Centre (ETC), we believe in creating a world where healing is not just possible, but accessible, compassionate, and deeply transformative.
Our name, Ehsaas, meaning "feeling" or "experience," is central to everything we do. Our acronym, ETC, serves as a gentle reminder that there is so much more to each of us: more healing, more growth, more connection, more freedom, and more life to experience.

                </p>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                 We provide a therapeutic space that is trauma-informed, queer-affirmative, neurodivergent-aware, and sex-positive, honouring and celebrating the unique journeys of individuals.Our diverse therapeutic approaches are designed to help you build insight and process thoughts and emotions, safely and with compassion, fostering deeper healing.

                </p>
                <p className="text-lg text-muted-foreground leading-relaxed">
                What truly distinguishes us is our unwavering commitment to building a safe space not only for our clients but also for our mental health professionals. We firmly believe that the well-being of therapists is integral to the quality of care they provide. Therefore, we ensure fair compensation, professional respect, and an emotionally supportive working environment without compromise.
We offer a wide range of therapists, each with unique expertise, language skills, lived experience, and therapeutic style, ensuring that care is not only competent but also truly affirming. Whether you're seeking cultural sensitivity, identity-affirming support, or a specialist in a particular area, we are here to match you with the right therapist. This ensures that clients can find a therapist who truly resonates with them. Because healing is not one-size-fits-all, and at ETC, we deeply respect that.

                </p>
              </CardContent>
            </Card>
          </div>

          {/* Mission & Vision */}
          <div className="grid md:grid-cols-2 gap-8 mb-20">
            <Card className="p-8">
              <CardContent className="pt-6">
                <div className="flex items-center mb-6">
                  <Target className="w-8 h-8 text-primary mr-4" />
                  <h2 className="text-3xl font-bold text-foreground">Our Mission</h2>
                </div>
                <ul className="text-lg text-muted-foreground leading-relaxed space-y-2">
                  <li>• To provide accessible, inclusive, and high-quality therapy rooted in safety, empathy, and respect.</li>
                  <li>• To create emotionally safe and empowering spaces for both clients and mental health professionals.</li>
                  <li>• To offer trauma-informed, queer-affirmative, neurodivergent-aware, and sex-positive therapy from skilled, diverse practitioners.</li>
                  <li>• To remind everyone that they are more than their pain and that healing leads to more: more growth, more connection, more freedom, and more life to experience.</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="p-8">
              <CardContent className="pt-6">
                <div className="flex items-center mb-6">
                  <Eye className="w-8 h-8 text-secondary mr-4" />
                  <h2 className="text-3xl font-bold text-foreground">Our Vision</h2>
                </div>
                <ul className="text-lg text-muted-foreground leading-relaxed space-y-2">
                  <li>• To help build a world filled with more healed individuals, where people feel seen, safe, and supported.</li>
                  <li>• To nurture care-based communities that prioritize holistic well-being and deeper engagement with life's emotional landscape.</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* About Founder */}
          <div className="mb-20">
            <Card className="p-8">
              <CardContent className="pt-6">
                <div className="flex items-center mb-6">
                  <User className="w-8 h-8 text-secondary mr-4" />
                  <h2 className="text-3xl font-bold text-foreground">About the Founder</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-8 items-center">
                  <div className="md:col-span-1">
                    <Avatar className="w-48 h-48 mx-auto">
                      <AvatarImage 
                        src="/lovable-uploads/9549b643-3ac0-4a93-9c8b-9e4affbc9d65.png" 
                        alt="Priyadarshini Sethia - Founder"
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-gradient-hero">
                        <User className="w-24 h-24 text-white" />
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="md:col-span-2">
                    <h3 className="text-2xl font-bold text-foreground mb-4">Priyadarshini Sethia</h3>
                    <p className="text-lg text-muted-foreground leading-relaxed mb-4">
                   As a psychologist, Priyadarshini firmly believes that a sense of safety is the foundation of healing. She is dedicated to creating a space where individuals, regardless of whether they identify as queer, neurodivergent, are exploring their identity, or are simply navigating their emotions, can feel a true sense of belonging. She emphasizes that every story is important and all feelings deserve acknowledgment.
                    </p>
                    <p className="text-lg text-muted-foreground leading-relaxed mb-4">
                      The inspiration for Ehsaas Therapy Centre arose not only from her passion for therapy but also from her observations during her training. Priyadarshini witnessed the challenges faced by psychology students and interns, including overwork, underpayment and instances of exploitation, such as having to pay for internships without gaining meaningful experience. This awareness motivated her to establish a different kind of space—one that prioritizes the well-being of both clients and mental health professionals alike. At ETC, therapists are deeply valued, fairly compensated, and receive the same level of support they are expected to provide to others.

                    </p>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      At its core, Priyadarshini's philosophy is rooted in kindness, inclusivity, and the transformative power of feeling genuinely understood. She is dedicated to the idea that healing is possible for everyone and nobody should have to do it alone. Through Ehsaas Therapy Centre, Priyadarshini is committed to showing up for her clients, her fellow therapists, and a world where everyone can experience greater connectedness and deeper healing. 
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Values */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground mb-12">Our Core Values</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Compassionate Accessibility</h3>
                <p className="text-muted-foreground">We ensure mental health care is accessible with empathy and understanding at its core.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Eye className="w-8 h-8 text-secondary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Affirming Diversity</h3>
                <p className="text-muted-foreground">We celebrate and affirm all identities, creating inclusive spaces for everyone.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Holistic Healing</h3>
                <p className="text-muted-foreground">We address the whole person, nurturing mind, body, and spirit in the healing process.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Therapist Well-being</h3>
                <p className="text-muted-foreground">We prioritize the well-being and fair treatment of our mental health professionals.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
