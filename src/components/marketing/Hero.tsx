import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ArrowRight, Shield } from "lucide-react";
import { Link } from "react-router-dom";

export const Hero: React.FC = () => {
  return (
    <section id="hero" className="py-8 md:py-12 px-4">
      <div className="container mx-auto text-center max-w-6xl">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-2">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <Shield className="h-8 w-8 text-primary" />
            <span className="font-bold text-2xl text-primary">RegIQ</span>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            <Button variant="outline" size="sm" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/pricing">Start Free Trial</Link>
            </Button>
          </nav>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight mb-4 md:mb-6 leading-tight hyphens-none">
          <span className="whitespace-nowrap">Food manufacturers</span> waste 195 hours annually on <span className="whitespace-nowrap">broken regulatory</span> search
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed mb-6 md:mb-8 max-w-3xl mx-auto px-4 hyphens-none">
          <span className="whitespace-nowrap">95% of food companies</span> can't find the regulatory answers they need
        </p>

        <div className="flex flex-col gap-3 md:gap-4 justify-center items-center mb-6 md:mb-8 px-4">
          <Button size="lg" className="w-full sm:w-auto px-6 md:px-8 py-3 text-sm md:text-base" asChild>
            <Link to="/pricing">
              Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
            <p className="text-sm text-muted-foreground">14-day free trial • Cancel anytime • No credit card required</p>
        </div>
      </div>
    </section>
  );
};

export default Hero;
