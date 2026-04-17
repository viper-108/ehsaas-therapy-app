import { Link } from "react-router-dom";
import { Star, Heart, Users, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import forestBackground from "@/assets/forest-background.jpg";

const Home = () => {
  const services = [
    {
      icon: Users,
      title: "Individual Therapy",
      description: "One-on-one sessions with licensed psychologists",
    },
    {
      icon: Heart,
      title: "Couple Therapy",
      description: "Strengthen your relationship with professional guidance",
    },
    {
      icon: Users,
      title: "Training",
      description: "Helping young professionals to bridge the gap between theoretical knowledge and practical skills",
    },
    {
      icon: Clock,
      title: "Supervision",
      description: "Enhancing therapist competancy, and professional development",
    },
  ];

  const testimonials = [
    {
      name: "PM",
      text: "EHSAAS helped me through my darkest times. The therapists are incredibly caring and professional.",
      rating: 5,
    },
    {
      name: "RK",
      text: "The couple therapy sessions saved my marriage. We learned to communicate better and understand each other.",
      rating: 5,
    },
    {
      name: "ZS",
      text: "Priyadarshini is an amazing psychologist. She helped me recoup from anxiety, and patiently heard all my issues without any judgements",
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <div 
        className="relative min-h-screen flex items-center justify-center"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${forestBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="text-center text-white max-w-4xl mx-auto px-4">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            Feel the healing within
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90">
            Compassionate, inclusive and accessible therapy for your mental health journey
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg px-8 py-6">
              <Link to="/services">Explore Our Services</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6 bg-white/10 border-white text-white hover:bg-white hover:text-primary">
              <Link to="/team">Meet Our Team</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Services Preview */}
      <div className="py-20 bg-background">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">Our Services</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive mental health services designed to support your journey towards wellness
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, index) => (
              <Card key={index} className="text-center p-6 hover:shadow-large transition-all duration-300 hover:-translate-y-2">
                <CardContent className="pt-6">
                  <service.icon className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-3">{service.title}</h3>
                  <p className="text-muted-foreground">{service.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Button asChild size="lg">
              <Link to="/services">View All Services</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">What Our Clients Say</h2>
            <p className="text-lg text-muted-foreground">
              Real stories from people who found healing with EHSAAS
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6">
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4 italic">"{testimonial.text}"</p>
                  <p className="font-semibold text-foreground">- {testimonial.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gradient-hero">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Begin Your Healing Journey?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Take the first step towards better mental health with our professional therapists
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" variant="secondary" className="text-lg px-8 py-6">
              <Link to="/team">Book a Session</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6 bg-white/10 border-white text-white hover:bg-white hover:text-primary">
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-foreground text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">EHSAAS</h3>
              <p className="text-white/80">Feel the healing within</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <div className="space-y-2">
                <Link to="/about" className="block text-white/80 hover:text-white">About Us</Link>
                <Link to="/services" className="block text-white/80 hover:text-white">Services</Link>
                <Link to="/team" className="block text-white/80 hover:text-white">Our Team</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <div className="space-y-2">
                <Link to="/faqs" className="block text-white/80 hover:text-white">FAQs</Link>
                <Link to="/contact" className="block text-white/80 hover:text-white">Contact</Link>
                <Link to="/blogs" className="block text-white/80 hover:text-white">Blogs</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <div className="space-y-2 text-white/80">
                <p>sessions.ehsaas@gmail.com</p>
                <p>+91-7411948161</p>
                <p>@ehsaas.therapy.centre</p>
              </div>
            </div>
          </div>
          <div className="border-t border-white/20 mt-8 pt-8 text-center text-white/60">
            <p>&copy; 2024 EHSAAS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;