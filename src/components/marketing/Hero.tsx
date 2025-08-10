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
          Stop Wasting 195 Hours Per Year on Regulatory Search
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed mb-6 md:mb-8 max-w-3xl mx-auto px-4">
          RegIQ unifies FDA/USDA/EPA alerts for food manufacturers. Get instant answers to plant-floor questions.
        </p>

        <div className="flex flex-col gap-3 md:gap-4 justify-center items-center mb-6 md:mb-8 px-4">
          <Button size="lg" className="w-full sm:w-auto px-6 md:px-8 py-3 text-sm md:text-base" asChild>
            <Link to="/pricing">
              Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <div className="flex flex-col items-center gap-2">
            <a href="#food-alerts" className="text-sm underline text-primary hover:opacity-90">See live alerts</a>
            <p className="text-xs text-muted-foreground">Join 50+ food manufacturers already using RegIQ</p>
            <p className="text-xs text-muted-foreground">Every month you wait = $3,600 in wasted compliance time</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
