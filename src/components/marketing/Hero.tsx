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
          Regulatory intelligence built for food manufacturing
        </h1>
        <p className="text-base md:text-lg lg:text-xl text-muted-foreground mb-6 md:mb-8 max-w-3xl mx-auto px-4">
          Your team is losing 195 hours a year to broken regulatory search. RegIQ unifies FDA/USDA/EPA and translates plant-floor questions into clear, food-specific answers.
        </p>

        <div className="flex flex-col gap-3 md:gap-4 justify-center items-center mb-6 md:mb-8 px-4">
          <Button size="lg" className="w-full sm:w-auto px-6 md:px-8 py-3 text-sm md:text-base" asChild>
            <Link to="/pricing">
              Start 14-Day Free Trial <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full sm:w-auto px-6 md:px-8 py-3 text-sm md:text-base" asChild>
              <a href="#food-alerts">See live FDA/USDA/EPA alerts now</a>
            </Button>
            <Button variant="secondary" size="lg" className="w-full sm:w-auto px-6 md:px-8 py-3 text-sm md:text-base" asChild>
              <Link to="/pricing">Compare Plans</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
