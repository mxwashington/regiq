import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export const SocialProof: React.FC = () => {
  return (
    <section id="social-proof" className="py-6 md:py-8 px-4 bg-muted/20">
      <div className="container mx-auto max-w-6xl">
        <p className="text-center text-sm text-muted-foreground mb-4">Trusted by busy QA and compliance teams</p>
        <Card className="mb-4 md:mb-6">
          <CardContent className="pt-6">
            <blockquote className="text-center text-base md:text-lg leading-relaxed">
              “Add real customer quote here about saving time and making faster decisions.”
            </blockquote>
            <p className="text-center text-sm text-muted-foreground mt-2">— Name, Title, Company</p>
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-6 items-center">
          {[
            "FoodCo",
            "AgriLabs",
            "Nutrify",
            "QualityWorks",
            "SafeSupply",
          ].map((name) => (
            <Card key={name} className="border-dashed">
              <CardContent className="py-6 flex items-center justify-center">
                <span className="text-muted-foreground text-sm md:text-base">{name}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProof;
