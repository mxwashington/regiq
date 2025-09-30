import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ArrowRight, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const Hero: React.FC = () => {
  const { user } = useAuth();

  return (
    <section id="hero" className="py-8 md:py-12 px-4">
      <div className="container mx-auto text-center max-w-6xl">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="font-bold text-2xl text-primary">RegIQ</span>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            {user ? (
              <Button variant="outline" size="sm" asChild>
                <Link to="/account">Account</Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
            )}
            {user ? (
              <Button size="sm" asChild>
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <Button size="sm" asChild>
                <Link to="/pricing">Get Started</Link>
              </Button>
            )}
          </nav>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight mb-4 md:mb-6 leading-tight hyphens-none">
          Stop Losing <span className="text-primary">$34,487 Per Year</span> on Failed Regulatory Searches
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed mb-6 md:mb-8 max-w-3xl mx-auto px-4 hyphens-none">
          Food regulatory professionals waste <strong>15.5 hours weekly</strong> on searches that fail 30-70% of the time. RegIQ's AI-powered platform delivers instant, plain-English answers to FDA/USDA questions.
        </p>

        <div className="flex flex-col gap-3 md:gap-4 justify-center items-center mb-6 md:mb-8 px-4">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto px-6 md:px-8 py-3 text-sm md:text-base" asChild>
              <Link to="/pricing">
                Start Free, Upgrade Anytime <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto px-6 md:px-8 py-3 text-sm md:text-base" asChild>
              <a href="https://calendly.com/marcus-regiq" target="_blank" rel="noopener noreferrer">
                Schedule a Demo
              </a>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">No credit card required</p>
        </div>
      </div>
    </section>
  );
};

export default Hero;
