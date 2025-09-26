import React, { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import Welcome from "@/components/onboarding/Welcome";
import CompanySetup from "@/components/onboarding/CompanySetup";
import AlertPreferences from "@/components/onboarding/AlertPreferences";
import DigestSetup from "@/components/onboarding/DigestSetup";
import DashboardTour from "@/components/onboarding/DashboardTour";

const steps = ["Welcome","Company","Preferences","Suppliers","Digest","Finish"] as const;

const Onboarding: React.FC = () => {
  const [step, setStep] = useState(0);
  const next = () => setStep((s)=> Math.min(s+1, steps.length-1));
  const back = () => setStep((s)=> Math.max(s-1, 0));

  const StepComponent = useMemo(()=>{
    switch(step){
      case 0: return <Welcome onNext={next} />;
      case 1: return <CompanySetup onNext={next} />;
      case 2: return <AlertPreferences onNext={next} onBack={back} />;
      case 3: return <SupplierSetup onNext={next} onBack={back} />;
      case 4: return <DigestSetup onNext={next} onBack={back} />;
      case 5: return <DashboardTour onBack={back} />;
      default: return null;
    }
  },[step]);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Onboarding - RegIQ</title>
        <meta name="description" content="Get set up in minutes: company, preferences, suppliers, and email digest." />
        <link rel="canonical" href="https://regiq.com/onboarding" />
      </Helmet>

      <section className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-4">Quick Setup</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          {steps.map((label, i)=> (
            <div key={label} className={`flex items-center gap-2 ${i===step? 'text-foreground font-medium' : ''}`}>
              <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${i<=step? 'bg-primary text-white border-primary' : ''}`}>{i+1}</div>
              <span className="hidden sm:inline">{label}</span>
              {i < steps.length-1 && <span className="opacity-50">›</span>}
            </div>
          ))}
        </div>
        {StepComponent}
      </section>
    </div>
  );
};

export default Onboarding;
