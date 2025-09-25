import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

interface SavedAlert {
  id: string;
  savedAt: number;
}

export const useSavedAlerts = () => {
  const [savedAlerts, setSavedAlerts] = useState<SavedAlert[]>([]);

  // Load saved alerts from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('regiq_saved_alerts');
      if (saved) {
        setSavedAlerts(JSON.parse(saved));
      }
    } catch (error) {
      logger.warn('Failed to load saved alerts:', error, 'useSavedAlerts');
    }
  }, []);

  // Save to localStorage whenever savedAlerts changes
  useEffect(() => {
    try {
      localStorage.setItem('regiq_saved_alerts', JSON.stringify(savedAlerts));
    } catch (error) {
      logger.warn('Failed to save alerts to localStorage:', error, 'useSavedAlerts');
    }
  }, [savedAlerts]);

  const toggleSaveAlert = (alertId: string) => {
    setSavedAlerts(prev => {
      const exists = prev.find(item => item.id === alertId);
      if (exists) {
        // Remove from saved
        return prev.filter(item => item.id !== alertId);
      } else {
        // Add to saved
        return [...prev, { id: alertId, savedAt: Date.now() }];
      }
    });
  };

  const isAlertSaved = (alertId: string) => {
    return savedAlerts.some(item => item.id === alertId);
  };

  const getSavedAlertIds = () => {
    return savedAlerts.map(item => item.id);
  };

  return {
    savedAlerts,
    toggleSaveAlert,
    isAlertSaved,
    getSavedAlertIds
  };
};