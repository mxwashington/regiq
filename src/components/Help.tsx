import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, MessageCircle, FileText, Video } from "lucide-react";
import { toast } from "sonner";

export const Help: React.FC = () => {
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);

  const faqs = [
    {
      q: "How do I set up my first alerts?",
      a: "Go to Settings > Alert Preferences to choose which agencies and topics you want to monitor. You can also add specific suppliers to watch."
    },
    {
      q: "What does the urgency score mean?",
      a: "Our AI rates alerts from 1-10 based on potential business impact. Red (8-10) = immediate action needed, Yellow (4-7) = monitor closely, Gray (1-3) = informational."
    },
    {
      q: "How often are alerts updated?",
      a: "We check government sources every 15 minutes for new alerts. Our AI processes and scores them within minutes of publication."
    },
    {
      q: "Can I export alerts for my team?",
      a: "Yes! Use the Export button on any alert feed to download as PDF or Excel. Professional+ plans include automated weekly reports."
    },
    {
      q: "How do I manage my subscription?",
      a: "Go to Account > Billing to upgrade, downgrade, or cancel your subscription. All changes take effect at your next billing cycle."
    }
  ];

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // In a real app, this would send to a support system
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Message sent! We'll respond within 24 hours.");
      setContactForm({ name: "", email: "", message: "" });
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Help Center</h1>
        <p className="text-muted-foreground">Get the most out of RegIQ with our guides and support</p>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Card className="text-center hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4">
            <Video className="w-8 h-8 mx-auto mb-2 text-primary" />
            <h3 className="font-medium mb-1">Video Tutorials</h3>
            <p className="text-xs text-muted-foreground">Watch setup guides</p>
          </CardContent>
        </Card>
        <Card className="text-center hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4">
            <FileText className="w-8 h-8 mx-auto mb-2 text-primary" />
            <h3 className="font-medium mb-1">User Guide</h3>
            <p className="text-xs text-muted-foreground">Step-by-step docs</p>
          </CardContent>
        </Card>
        <Card className="text-center hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 text-primary" />
            <h3 className="font-medium mb-1">Live Chat</h3>
            <p className="text-xs text-muted-foreground">Instant support</p>
            <Badge variant="outline" className="mt-1">Premium</Badge>
          </CardContent>
        </Card>
        <Card className="text-center hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4">
            <HelpCircle className="w-8 h-8 mx-auto mb-2 text-primary" />
            <h3 className="font-medium mb-1">FAQs</h3>
            <p className="text-xs text-muted-foreground">Common questions</p>
          </CardContent>
        </Card>
      </div>

      {/* FAQs */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            {faqs.map((faq, idx) => (
              <AccordionItem key={idx} value={`item-${idx}`}>
                <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Contact Form */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Support</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleContact} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                placeholder="Your name"
                value={contactForm.name}
                onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
              <Input
                type="email"
                placeholder="Your email"
                value={contactForm.email}
                onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            <Textarea
              placeholder="Describe your question or issue..."
              value={contactForm.message}
              onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
              required
              rows={4}
            />
            <Button type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send Message"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Help;