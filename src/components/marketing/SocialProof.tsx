import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export const SocialProof: React.FC = () => {
  return (
    <section className="py-6 md:py-8 px-4 bg-muted/20">
      <div className="container mx-auto max-w-6xl">
        <p className="text-center text-sm text-muted-foreground mb-4">Trusted by busy QA and compliance teams</p>
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
