import { useState } from "react";
import { Mail, Phone, Instagram, MapPin, Clock, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Navigation from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:5001/api';

const Contact = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const update = (field: string, value: string) => setForm({ ...form, [field]: value });

  const contactInfo = [{
    icon: Mail,
    title: "Email",
    value: "sessions@ehsaastherapycentre.com",
    description: "Send us your questions anytime",
    href: "mailto:sessions@ehsaastherapycentre.com"
  }, {
    icon: Phone,
    title: "WhatsApp Support",
    value: "+91-7411948161",
    description: "Chat with us on WhatsApp",
    href: "https://wa.me/917411948161"
  }, {
    icon: Instagram,
    title: "Instagram",
    value: "@ehsaas.therapy.centre",
    description: "Follow us for daily insights",
    href: "https://instagram.com/ehsaas.therapy.centre"
  }];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send message");
      toast({ title: "Message sent", description: "Thanks! We'll get back to you soon." });
      setForm({ firstName: "", lastName: "", email: "", phone: "", subject: "", message: "" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to send message", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="min-h-screen bg-background">
      <Navigation />

      <div className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-foreground mb-6">{t('contactPage.getInTouch')}</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              We're here to support you on your mental health journey. Reach out with any questions or to schedule a session.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card className="p-8">
                <CardContent className="pt-6">
                  <h2 className="text-2xl font-bold text-foreground mb-6">Send us a Message</h2>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          First Name *
                        </label>
                        <Input
                          placeholder="Enter your first name"
                          value={form.firstName}
                          onChange={(e) => update("firstName", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Last Name *
                        </label>
                        <Input
                          placeholder="Enter your last name"
                          value={form.lastName}
                          onChange={(e) => update("lastName", e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Email Address *
                      </label>
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Phone Number
                      </label>
                      <Input
                        type="tel"
                        placeholder="Enter your phone number"
                        value={form.phone}
                        onChange={(e) => update("phone", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Subject *
                      </label>
                      <Input
                        placeholder="What is this regarding?"
                        value={form.subject}
                        onChange={(e) => update("subject", e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Message *
                      </label>
                      <Textarea
                        placeholder="Tell us how we can help you..."
                        rows={5}
                        value={form.message}
                        onChange={(e) => update("message", e.target.value)}
                        required
                      />
                    </div>

                    <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                      <Send className="w-4 h-4 mr-2" />
                      {submitting ? t('contactPage.form.sending') : t('contactPage.form.send')}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Contact Information */}
            <div className="space-y-6">
              {/* Contact Methods */}
              <Card className="p-6 px-[2px]">
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold text-foreground mb-6">Contact Information</h3>
                  <div className="space-y-6">
                    {contactInfo.map((info, index) => <a key={index} href={info.href} target="_blank" rel="noopener noreferrer" className="flex items-start gap-4 pl-1 pr-2 py-2 rounded-lg hover:bg-muted/50 transition-colors group">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                          <info.icon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{info.title}</h4>
                          <p className="text-primary font-medium">{info.value}</p>
                          <p className="text-sm text-muted-foreground">{info.description}</p>
                        </div>
                      </a>)}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="p-6">
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <Button asChild className="w-full" variant="outline">
                      <a href="/team">Book a Session</a>
                    </Button>
                    <Button asChild className="w-full" variant="outline">
                      <a href="/faqs">View FAQs</a>
                    </Button>
                    <Button asChild className="w-full" variant="outline">
                      <a href="https://wa.me/917411948161" target="_blank" rel="noopener noreferrer">
                        Chat on WhatsApp
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Emergency Notice */}
          <div className="mt-12">
            <Card className="bg-destructive/10 border-destructive/20 p-6">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold text-destructive mb-3">
                  Mental Health Emergency?
                </h3>
                <p className="text-destructive/80 mb-4">In case you are feeling suicidal or are in a crisis, please reach out to Tele-MANAS at 14416/ 18008914416 or call 108 to request an ambulance anywhere in India.


For anything else, leave a message above and we will get back to you at the earliest. </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button variant="destructive" asChild>
                    <a href="tel:112">Emergency Services: 108</a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="tel:9152987821">Crisis Helpline: 1800-8914-416</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>;
};
export default Contact;
