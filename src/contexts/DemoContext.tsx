import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

type DemoContentRow = Database['public']['Tables']['demo_content']['Row'];
type DemoSessionRow = Database['public']['Tables']['demo_sessions']['Row'];

interface DemoContent {
  id: string;
  content_type: 'recall' | 'alert' | 'search_result' | 'analytics' | 'user_activity';
  title: string;
  content: any;
  industry_focus: 'food_safety' | 'pharmaceutical' | 'agriculture' | 'general';
  demo_scenario: string | null;
  display_order: number;
}

interface DemoSession {
  id: string;
  session_key: string;
  demo_scenario: string | null;
  session_data: any;
  expires_at: string;
}

interface DemoContextType {
  isDemoMode: boolean;
  demoScenario: string;
  demoContent: DemoContent[];
  currentSession: DemoSession | null;
  toggleDemoMode: () => void;
  setDemoScenario: (scenario: string) => void;
  createDemoSession: (scenario: string) => Promise<void>;
  endDemoSession: () => Promise<void>;
  triggerDemoAlert: (alertType: string) => void;
  resetDemoData: () => Promise<void>;
  loading: boolean;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const useDemoMode = () => {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error('useDemoMode must be used within a DemoProvider');
  }
  return context;
};

export const DemoProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoScenario, setDemoScenarioState] = useState('food_safety');
  const [demoContent, setDemoContent] = useState<DemoContent[]>([]);
  const [currentSession, setCurrentSession] = useState<DemoSession | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadDemoContent();
  }, []);

  const loadDemoContent = async () => {
    try {
      const { data, error } = await supabase
        .from('demo_content')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      
      // Type cast the data to match our interface
      const typedData: DemoContent[] = (data || []).map(item => ({
        id: item.id,
        content_type: item.content_type as 'recall' | 'alert' | 'search_result' | 'analytics' | 'user_activity',
        title: item.title,
        content: item.content,
        industry_focus: item.industry_focus as 'food_safety' | 'pharmaceutical' | 'agriculture' | 'general',
        demo_scenario: item.demo_scenario,
        display_order: item.display_order
      }));
      
      setDemoContent(typedData);
    } catch (error) {
      console.error('Error loading demo content:', error);
    }
  };

  const toggleDemoMode = () => {
    setIsDemoMode(!isDemoMode);
    if (!isDemoMode) {
      toast({
        title: "Demo Mode Activated",
        description: "Now showing demonstration data for sales presentations",
        duration: 3000,
      });
    } else {
      toast({
        title: "Demo Mode Deactivated",
        description: "Returning to live data",
        duration: 3000,
      });
      endDemoSession();
    }
  };

  const setDemoScenario = (scenario: string) => {
    setDemoScenarioState(scenario);
    if (isDemoMode) {
      createDemoSession(scenario);
    }
  };

  const createDemoSession = async (scenario: string) => {
    try {
      setLoading(true);
      const sessionKey = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const { data, error } = await supabase
        .from('demo_sessions')
        .insert({
          session_key: sessionKey,
          demo_scenario: scenario,
          session_data: {
            scenario,
            started_at: new Date().toISOString(),
            features_demonstrated: [],
            interactions: []
          }
        })
        .select()
        .single();

      if (error) throw error;
      setCurrentSession(data);
      
      toast({
        title: "Demo Session Started",
        description: `${scenario.replace('_', ' ')} demo scenario activated`,
        duration: 3000,
      });
    } catch (error) {
      console.error('Error creating demo session:', error);
      toast({
        title: "Error",
        description: "Failed to start demo session",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const endDemoSession = async () => {
    if (!currentSession) return;

    try {
      await supabase
        .from('demo_sessions')
        .update({ 
          is_active: false,
          session_data: {
            ...currentSession.session_data,
            ended_at: new Date().toISOString()
          }
        })
        .eq('id', currentSession.id);

      setCurrentSession(null);
    } catch (error) {
      console.error('Error ending demo session:', error);
    }
  };

  const triggerDemoAlert = (alertType: string) => {
    if (!isDemoMode) return;

    const alerts = {
      recall: "🚨 URGENT: Multi-state Listeria outbreak detected in deli meats",
      warning_letter: "⚠️ FDA Warning Letter issued for GMP violations",
      regulation_change: "📋 New CFR regulation update requires immediate compliance",
      inspection: "🔍 Unannounced FDA inspection scheduled in your area"
    };

    toast({
      title: "Live Demo Alert",
      description: alerts[alertType as keyof typeof alerts] || "Demo alert triggered",
      duration: 5000,
    });

    // Track interaction in session
    if (currentSession) {
      const updatedInteractions = [
        ...(currentSession.session_data.interactions || []),
        {
          type: 'alert_triggered',
          alert_type: alertType,
          timestamp: new Date().toISOString()
        }
      ];

      supabase
        .from('demo_sessions')
        .update({
          session_data: {
            ...currentSession.session_data,
            interactions: updatedInteractions
          }
        })
        .eq('id', currentSession.id);
    }
  };

  const resetDemoData = async () => {
    try {
      setLoading(true);
      await loadDemoContent();
      
      if (currentSession) {
        await supabase
          .from('demo_sessions')
          .update({
            session_data: {
              ...currentSession.session_data,
              reset_at: new Date().toISOString(),
              interactions: []
            }
          })
          .eq('id', currentSession.id);
      }

      toast({
        title: "Demo Data Reset",
        description: "All demo content has been refreshed",
        duration: 3000,
      });
    } catch (error) {
      console.error('Error resetting demo data:', error);
      toast({
        title: "Error",
        description: "Failed to reset demo data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DemoContext.Provider
      value={{
        isDemoMode,
        demoScenario,
        demoContent,
        currentSession,
        toggleDemoMode,
        setDemoScenario,
        createDemoSession,
        endDemoSession,
        triggerDemoAlert,
        resetDemoData,
        loading,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
};