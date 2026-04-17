import { Users, Heart, Building, Brain, Palette, GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";

const Services = () => {
  const clientServices = [
    {
      icon: Users,
      title: "Individual Therapy",
      description: "One-on-one sessions with psychologists to address personal challenges, mental health concerns, and life transitions.",
      features: ["Personalised treatment plans", "Confidential sessions", "Flexible scheduling", "Evidence-based approaches"]
    },
    {
      icon: Heart,
      title: "Couple Therapy",
      description: "Professional guidance for couples to improve communication, resolve conflicts, and strengthen their relationship.",
      features: ["Communication skills", "Conflict resolution", "Intimacy building", "Relationship strengthening"]
    },
    {
      icon: Users,
      title: "Group Therapy",
      description: "Therapeutic sessions with small groups facing similar challenges, providing peer support and shared learning.",
      features: ["Peer support", "Shared experiences", "Cost-effective", "Social skill development"]
    }
  ];

  const corporateServices = [
    {
      icon: Building,
      title: "EAP (Employee Assistance Program)",
      description: "Comprehensive mental health support for organizations to improve employee wellbeing and productivity.",
      features: ["24/7 helpline", "Confidential counselling", "Workplace workshops", "Stress management programs"]
    },
    {
      icon: Palette,
      title: "Art Therapy",
      description: "Creative therapeutic approach using art-making to help individuals express emotions and process experiences.",
      features: ["Creative expression", "Non-verbal processing", "Stress relief", "Team building activities"]
    }
  ];

  const therapistServices = [
    {
      icon: Brain,
      title: "Individual Supervision",
      description: "Professional development and clinical guidance for practicing therapists to enhance their skills and practice.",
      features: ["Case consultation", "Skill development", "Ethical guidance", "Professional growth"]
    },
    {
      icon: Users,
      title: "Group Supervision",
      description: "Collaborative learning environment for therapists to share experiences and learn from peers.",
      features: ["Peer learning", "Case discussions", "Skill sharing", "Professional networking"]
    },
    {
      icon: GraduationCap,
      title: "Training Programs",
      description: "Specialized training courses and workshops for mental health professionals to expand their expertise.",
      features: ["Certification courses", "Workshop series", "Continuing education", "Skill enhancement"]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-foreground mb-6">Our Services</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Comprehensive mental health services designed to support individuals, couples, organizations, and fellow therapists
            </p>
          </div>

          {/* For Clients */}
          <div className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-foreground mb-4">For Clients</h2>
              <p className="text-lg text-muted-foreground">Professional therapy services for individuals and couples</p>
            </div>
            
            <div className="grid lg:grid-cols-3 gap-8">
              {clientServices.map((service, index) => (
                <Card key={index} className="p-6 h-full hover:shadow-large transition-all duration-300">
                  <CardContent className="pt-6">
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <service.icon className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="text-2xl font-semibold mb-3">{service.title}</h3>
                      <p className="text-muted-foreground">{service.description}</p>
                    </div>
                    
                    <div className="space-y-2 mb-6">
                      {service.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center text-sm">
                          <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    <Button asChild className="w-full">
                      <Link to="/team">Book Session</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* For Corporates */}
          <div className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-foreground mb-4">For Corporates</h2>
              <p className="text-lg text-muted-foreground">Workplace mental health solutions for organizations</p>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-8">
              {corporateServices.map((service, index) => (
                <Card key={index} className="p-8 h-full hover:shadow-large transition-all duration-300">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-6">
                      <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <service.icon className="w-8 h-8 text-secondary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-semibold mb-3">{service.title}</h3>
                        <p className="text-muted-foreground mb-4">{service.description}</p>
                        
                        <div className="space-y-2 mb-6">
                          {service.features.map((feature, idx) => (
                            <div key={idx} className="flex items-center text-sm">
                              <div className="w-2 h-2 bg-secondary rounded-full mr-3"></div>
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                        
                        <Button asChild variant="secondary">
                          <Link to="/contact">Get Quote</Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* For Therapists */}
          <div className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-foreground mb-4">For Therapists</h2>
              <p className="text-lg text-muted-foreground">Professional development and supervision services</p>
            </div>
            
            <div className="grid lg:grid-cols-3 gap-8">
              {therapistServices.map((service, index) => (
                <Card key={index} className="p-6 h-full hover:shadow-large transition-all duration-300">
                  <CardContent className="pt-6">
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <service.icon className="w-8 h-8 text-accent" />
                      </div>
                      <h3 className="text-2xl font-semibold mb-3">{service.title}</h3>
                      <p className="text-muted-foreground">{service.description}</p>
                    </div>
                    
                    <div className="space-y-2 mb-6">
                      {service.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center text-sm">
                          <div className="w-2 h-2 bg-accent rounded-full mr-3"></div>
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/contact">Learn More</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center bg-gradient-hero p-12 rounded-lg">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Choose the service that fits your needs and begin your journey towards better mental health
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" variant="secondary">
                <Link to="/team">Book a Session</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="bg-white/10 border-white text-white hover:bg-white hover:text-primary">
                <Link to="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Services;