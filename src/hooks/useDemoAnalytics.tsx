import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DemoInteraction {
  action: string;
  details?: Record<string, any>;
  timestamp: number;
}

export function useDemoAnalytics() {
  const [interactions, setInteractions] = useState<DemoInteraction[]>([]);
  const [sessionId] = useState(() => crypto.randomUUID());
  const { user } = useAuth();

  const trackInteraction = async (action: string, details?: Record<string, any>) => {
    const interaction: DemoInteraction = {
      action,
      details,
      timestamp: Date.now()
    };

    setInteractions(prev => [...prev, interaction]);

    // Log to database for analytics
    try {
      await (supabase as any).from('demo_analytics').insert({
        session_id: sessionId,
        user_id: user?.id || null,
        action,
        details: details || {},
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log demo interaction:', error);
    }
  };

  const getEngagementScore = () => {
    if (interactions.length === 0) return 0;
    
    const weights = {
      'search': 3,
      'filter': 2,
      'alert_click': 4,
      'export_attempt': 5,
      'tutorial_complete': 1,
      'cta_click': 6
    };

    return interactions.reduce((score, interaction) => {
      return score + (weights[interaction.action as keyof typeof weights] || 1);
    }, 0);
  };

  const getTimeSpent = () => {
    if (interactions.length === 0) return 0;
    const firstInteraction = Math.min(...interactions.map(i => i.timestamp));
    const lastInteraction = Math.max(...interactions.map(i => i.timestamp));
    return Math.round((lastInteraction - firstInteraction) / 1000); // seconds
  };

  const shouldShowConversionPrompt = () => {
    const engagementScore = getEngagementScore();
    const timeSpent = getTimeSpent();
    const hasSearched = interactions.some(i => i.action === 'search');
    const hasFiltered = interactions.some(i => i.action === 'filter');
    
    return !user && (engagementScore >= 8 || timeSpent >= 60 || (hasSearched && hasFiltered));
  };

  return {
    trackInteraction,
    interactions,
    engagementScore: getEngagementScore(),
    timeSpent: getTimeSpent(),
    shouldShowConversionPrompt: shouldShowConversionPrompt(),
    sessionId
  };
}