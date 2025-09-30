import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Shield, Filter, Zap, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/SafeAuthContext';
import { Button } from '@/components/ui/button';

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-primary rounded-2xl">
              <AlertTriangle className="w-12 h-12 text-primary-foreground" />
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
            Stay Ahead of
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
              Regulatory Changes
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Real-time alerts from 15 federal agencies. Filter, track, and act on the information that matters to your business.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" asChild className="gap-2">
              <Link to="/dashboard">
                View Live Alerts
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            
            <Button size="lg" variant="outline" asChild className="gap-2">
              <Link to="/dashboard">
                <Filter className="w-5 h-5" />
                Try Filters
              </Link>
            </Button>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            {user ? 'Go to your dashboard to see filtered alerts' : 'No signup required • Free to use • Updated in real-time'}
          </p>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-card p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow border">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3">Real-Time Updates</h3>
            <p className="text-muted-foreground">
              Get instant notifications as new alerts are published by federal agencies. Never miss critical regulatory changes.
            </p>
          </div>

          <div className="bg-card p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow border">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mb-4">
              <Filter className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3">Smart Filtering</h3>
            <p className="text-muted-foreground">
              Filter by agency, severity, date range, and keywords. Focus on what matters to your industry and business.
            </p>
          </div>

          <div className="bg-card p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow border">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3">Comprehensive Coverage</h3>
            <p className="text-muted-foreground">
              Monitor 15 federal agencies including FDA, EPA, CDC, and more. All in one unified dashboard.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-r from-primary to-purple-600 rounded-2xl p-12 text-primary-foreground">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">15+</div>
              <div className="text-primary-foreground/80">Federal Agencies</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">1000+</div>
              <div className="text-primary-foreground/80">Alerts Tracked</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-primary-foreground/80">Real-Time Monitoring</div>
            </div>
          </div>
        </div>
      </div>

      {/* Agencies Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center text-foreground mb-12">
          Monitored Agencies
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {['FDA', 'CDC', 'EPA', 'FSIS', 'USDA', 'TTB', 'NOAA', 'OSHA', 'APHIS', 'CBP', 'Federal Register', 'Regulations.gov'].map(agency => (
            <div 
              key={agency} 
              className="bg-card p-4 rounded-lg border-2 border-border text-center font-semibold text-foreground hover:border-primary hover:text-primary transition-all"
            >
              {agency}
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button asChild variant="link" className="gap-2">
            <Link to="/dashboard">
              View all alerts on dashboard
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-card border rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to Stay Informed?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start monitoring federal alerts right now. {user ? 'Go to your dashboard.' : 'No registration, no credit card, completely free.'}
          </p>
          <Button size="lg" asChild className="gap-2">
            <Link to="/dashboard">
              Go to Dashboard
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
