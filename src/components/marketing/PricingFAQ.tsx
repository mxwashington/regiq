import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, TrendingUp, Users, Zap } from 'lucide-react';

export const PricingFAQ: React.FC = () => {
  const faqs = [
    {
      question: "What's included in the 14-day free trial?",
      answer: "Your free trial includes full access to all features of your chosen plan. No credit card required to start. You'll get real regulatory alerts, AI summarization, and can test our mobile app. We'll even help you set up your first facility during onboarding."
    },
    {
      question: "How quickly will I see ROI with RegIQ?",
      answer: "Most customers see ROI within 30 days. RegIQ saves an average of 195 hours annually on regulatory research, reduces compliance costs by $40,000+, and prevents costly regulatory violations. Our customers report 8-23:1 returns on their RegIQ investment."
    },
    {
      question: "Can I upgrade or downgrade my plan anytime?",
      answer: "Yes! You can change plans anytime with immediate effect. Upgrades are prorated and take effect immediately. Downgrades take effect at your next billing cycle. No penalties or fees for plan changes."
    },
    {
      question: "What happens when I reach my user or facility limits?",
      answer: "We'll notify you when you're approaching your limits and make it easy to upgrade. Growth plan users get priority upgrade assistance, and Professional plan users have unlimited users and facilities."
    },
    {
      question: "Is my regulatory data secure with RegIQ?",
      answer: "Absolutely. RegIQ uses enterprise-grade security with SOC 2 Type II compliance, end-to-end encryption, and regular security audits. Your compliance data is protected with the same security standards used by Fortune 500 companies."
    },
    {
      question: "Do you offer custom integrations and API access?",
      answer: "Professional plan includes custom integrations via webhooks and basic API access. For advanced API needs, custom integrations, or white-label solutions, contact our enterprise team for a custom quote."
    },
    {
      question: "What kind of support do you provide?",
      answer: "Starter: Email support with 24-hour response. Growth: Priority email + phone support during business hours. Professional: Dedicated customer success manager with priority phone/email support and custom onboarding."
    },
    {
      question: "Can I cancel anytime?",
      answer: "Yes, you can cancel your RegIQ subscription at any time with no penalties. Annual subscribers receive a prorated refund for unused months. We also offer a 30-day money-back guarantee if you're not satisfied."
    }
  ];

  return (
    <section className="py-16 px-4 bg-muted/20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about RegIQ pricing and plans
          </p>
        </div>

        {/* FAQ Accordion */}
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="bg-background border rounded-lg px-6"
            >
              <AccordionTrigger className="text-left hover:no-underline py-6">
                <span className="font-semibold text-base">{faq.question}</span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-6 leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* ROI Guarantee Section */}
        <div className="mt-16 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-2xl p-8 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-center mb-4">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-4 py-2">
                <TrendingUp className="w-4 h-4 mr-2" />
                ROI Guarantee
              </Badge>
            </div>
            <h3 className="text-2xl font-bold mb-4">
              See ROI in 30 Days or Your Money Back
            </h3>
            <p className="text-muted-foreground mb-6">
              We're so confident RegIQ will transform your regulatory compliance that we guarantee measurable ROI within 30 days. If you don't see significant time savings and compliance improvements, we'll refund your investment.
            </p>
            <Button size="lg" className="bg-primary hover:bg-primary/90">
              Start Your Risk-Free Trial
            </Button>
          </div>
        </div>

        {/* Still Have Questions */}
        <div className="mt-12 text-center">
          <h3 className="text-xl font-semibold mb-2">Still have questions?</h3>
          <p className="text-muted-foreground mb-6">
            Our team is here to help you find the perfect RegIQ plan for your organization.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="outline" size="lg">
              Schedule a Demo
            </Button>
            <Button variant="outline" size="lg">
              Contact Sales
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};