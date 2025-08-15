import React from "react";
import { Helmet } from "react-helmet-async";
import { Help as HelpComponent } from "@/components/Help";

const HelpPage: React.FC = () => (
  <div className="min-h-screen bg-background">
    <Helmet>
      <title>Help Center | RegIQ</title>
      <meta name="description" content="Get help with RegIQ regulatory alerts. FAQs, guides, and support." />
      <meta name="keywords" content="RegIQ help, regulatory alerts support, FDA alerts help, USDA alerts help" />
      <link rel="canonical" href="https://regiq.com/help" />
    </Helmet>
    <HelpComponent />
  </div>
);

export default HelpPage;