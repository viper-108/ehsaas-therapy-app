import { useState } from "react";
import { ChevronDown, HelpCircle, Phone, Calendar, Shield, CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";

const FAQs = () => {
  const [openItems, setOpenItems] = useState<number[]>([]);

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const faqCategories = [
    {
      title: "Getting Started",
      icon: HelpCircle,
      faqs: [
        {
          question: "How do I book my first session?",
          answer: "You can book your first session by visiting our 'Team' page, browsing through our qualified psychologists, and clicking 'Book Now' on the therapist you'd like to work with. You'll be able to choose between 30-minute (₹600) or 60-minute (₹900) sessions."
        },
        {
          question: "Do I need to prepare anything for my first session?",
          answer: "No special preparation is needed. Just come with an open mind and be ready to share what brings you to therapy. Your therapist will guide the conversation and help you feel comfortable."
        },
        {
          question: "What if I'm not sure which therapist is right for me?",
          answer: "Each therapist's profile includes their specializations, experience, and approach. You can also contact us for a brief consultation to help match you with the most suitable therapist for your needs."
        }
      ]
    },
    {
      title: "Sessions & Scheduling",
      icon: Calendar,
      faqs: [
        {
          question: "How long are the sessions?",
          answer: "We offer two session lengths: 30 minutes for ₹600 and 60 minutes for ₹900. Most clients find 60-minute sessions provide more time for meaningful conversation and progress."
        },
        {
          question: "Can I reschedule or cancel my appointment?",
          answer: "Yes, you can reschedule or cancel your appointment up to 24 hours before your scheduled time without any charges. Changes made with less than 24 hours notice may incur a fee."
        },
        {
          question: "Are sessions conducted online or in-person?",
          answer: "We offer both online and in-person sessions. Online sessions are conducted via secure video platforms, while in-person sessions are available at our clinic locations."
        },
        {
          question: "What happens if I miss my session?",
          answer: "If you miss your session without prior notice, the full session fee will be charged. We recommend setting reminders and contacting us as soon as possible if you need to make changes."
        }
      ]
    },
    {
      title: "Privacy & Confidentiality",
      icon: Shield,
      faqs: [
        {
          question: "Is my information kept confidential?",
          answer: "Absolutely. All sessions and personal information are kept strictly confidential in accordance with professional ethics and legal requirements. Information is only shared with your explicit consent or in rare cases where there's a risk of harm."
        },
        {
          question: "Are online sessions secure?",
          answer: "Yes, we use HIPAA-compliant, encrypted video platforms to ensure your online sessions are completely secure and private."
        },
        {
          question: "Who has access to my session records?",
          answer: "Only your assigned therapist and necessary administrative staff have access to your records, and this access is strictly limited to providing you with the best care possible."
        }
      ]
    },
    {
      title: "Payments & Pricing",
      icon: CreditCard,
      faqs: [
        {
          question: "What are the session fees?",
          answer: "Our sessions are priced at ₹600 for 30 minutes and ₹900 for 60 minutes. This covers the session fee and all administrative costs."
        },
        {
          question: "What payment methods do you accept?",
          answer: "We accept all major credit cards, debit cards, UPI payments, and bank transfers. Payment is processed securely before your session."
        },
        {
          question: "Do you offer any discounts or packages?",
          answer: "We occasionally offer package deals for multiple sessions. Students and seniors may be eligible for discounted rates. Please contact us to learn about current offers."
        },
        {
          question: "Is therapy covered by insurance?",
          answer: "Coverage varies by insurance provider and plan. We can provide you with receipts and documentation that you can submit to your insurance company for potential reimbursement."
        }
      ]
    },
    {
      title: "Support & Contact",
      icon: Phone,
      faqs: [
        {
          question: "How can I contact customer support?",
          answer: "You can reach us via email at sessions.ehsaas@gmail.com, WhatsApp at +91-7411948161, or follow us on Instagram @ehsaas.therapy.centre for updates and support."
        },
        {
          question: "What if I have a mental health emergency?",
          answer: "If you're experiencing a mental health emergency, please contact your local emergency services (112) or a crisis helpline immediately. Our therapists are not available for emergency situations outside of scheduled sessions."
        },
        {
          question: "Can I switch therapists if needed?",
          answer: "Yes, if you feel your current therapist isn't the right fit, we can help you transition to another therapist in our network. Your comfort and progress are our priorities."
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="py-20">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-foreground mb-6">Frequently Asked Questions</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Find answers to common questions about our therapy services, booking process, and more
            </p>
          </div>

          {/* FAQ Categories */}
          <div className="space-y-8">
            {faqCategories.map((category, categoryIndex) => (
              <Card key={categoryIndex} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Category Header */}
                  <div className="bg-primary/5 p-6 border-b">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <category.icon className="w-5 h-5 text-primary" />
                      </div>
                      <h2 className="text-2xl font-semibold text-foreground">{category.title}</h2>
                    </div>
                  </div>

                  {/* FAQ Items */}
                  <div className="divide-y">
                    {category.faqs.map((faq, faqIndex) => {
                      const itemIndex = categoryIndex * 100 + faqIndex;
                      const isOpen = openItems.includes(itemIndex);
                      
                      return (
                        <div key={faqIndex}>
                          <button
                            onClick={() => toggleItem(itemIndex)}
                            className="w-full p-6 text-left hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex justify-between items-center">
                              <h3 className="text-lg font-medium text-foreground pr-4">
                                {faq.question}
                              </h3>
                              <ChevronDown 
                                className={`w-5 h-5 text-muted-foreground transition-transform ${
                                  isOpen ? 'transform rotate-180' : ''
                                }`}
                              />
                            </div>
                          </button>
                          
                          {isOpen && (
                            <div className="px-6 pb-6 animate-fade-in">
                              <p className="text-muted-foreground leading-relaxed">
                                {faq.answer}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Contact CTA */}
          <div className="mt-16">
            <Card className="bg-gradient-hero p-8 text-center">
              <h2 className="text-3xl font-bold text-white mb-4">
                Still Have Questions?
              </h2>
              <p className="text-xl text-white/90 mb-8">
                Our support team is here to help you with any additional questions or concerns
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild variant="secondary" size="lg">
                  <a href="/contact">Contact Support</a>
                </Button>
                <Button asChild variant="outline" size="lg" className="bg-white/10 border-white text-white hover:bg-white hover:text-primary">
                  <a href="https://wa.me/917411948161" target="_blank" rel="noopener noreferrer">
                    WhatsApp Chat
                  </a>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQs;