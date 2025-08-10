import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export const Hero: React.FC = () => {
  return (
    <section id="hero" className="py-8 md:py-12 px-4">
      <div className="container mx-auto text-center max-w-6xl">

        <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight mb-4 md:mb-6 leading-tight">
          Food manufacturers waste 195 hours annually on broken regulatory search
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed mb-6 md:mb-8 max-w-3xl mx-auto px-4">
          95% of food companies can't find the regulatory answers they need
        </p>

        <div className="flex flex-col gap-3 md:gap-4 justify-center items-center mb-6 md:mb-8 px-4">
          <Button size="lg" className="w-full sm:w-auto px-6 md:px-8 py-3 text-sm md:text-base" asChild>
            <Link to="/pricing">
              Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">14-day free trial • Cancel anytime • No credit card required</p>
            <ul className="text-left text-sm md:text-base text-muted-foreground leading-relaxed list-disc pl-5 max-w-2xl">
              <li>95% of food companies can't find the regulatory answers they need</li>
              <li>Failed searches cost $34,487 per compliance professional annually</li>
              <li>Cross-agency confusion between FDA/USDA wastes 195 hours per year</li>
              <li>60% of decisions happen on plant floors—but no tools work on mobile</li>
            </ul>
            <p className="text-sm text-muted-foreground">The current system is broken. RegIQ fixes it.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
