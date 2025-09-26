import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

export const TeamManagement: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [emails, setEmails] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [savedEmails, setSavedEmails] = useState<string>('');

  useEffect(() => {
    loadSavedInvites();
  }, [user]);

  const loadSavedInvites = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('metadata')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      const teamInvites = data?.metadata?.team_invites || '';
      setEmails(teamInvites);
      setSavedEmails(teamInvites);
    } catch (error) {
      logger.error('Error loading team invites:', error);
      // Fallback to localStorage for backward compatibility
      const localEmails = localStorage.getItem('team_invites') || '';
      setEmails(localEmails);
      setSavedEmails(localEmails);
    }
  };

  const validateEmails = (emailString: string): boolean => {
    if (!emailString.trim()) return true; // Empty is valid

    const emailList = emailString.split(',').map(e => e.trim()).filter(e => e.length > 0);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const email of emailList) {
      if (!emailRegex.test(email)) {
        toast.error(`Invalid email address: ${email}`);
        return false;
      }
    }

    if (emailList.length > 10) {
      toast.error('Maximum 10 email invites allowed');
      return false;
    }

    return true;
  };

  const save = async () => {
    if (!user) return;
    if (!validateEmails(emails)) return;

    setLoading(true);
    try {
      // Get current preferences
      const { data: currentPrefs } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const updatedMetadata = {
        ...currentPrefs?.metadata,
        team_invites: emails.trim(),
        last_updated: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          metadata: updatedMetadata,
          email_notifications: currentPrefs?.email_notifications ?? true,
          urgency_threshold: currentPrefs?.urgency_threshold ?? 'Low'
        });

      if (error) throw error;

      setSavedEmails(emails);
      localStorage.setItem('team_invites', emails); // Backup to localStorage
      toast.success('Team invites saved successfully');
    } catch (error) {
      logger.error('Error saving team invites:', error);
      toast.error('Failed to save team invites');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = emails !== savedEmails;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Team Management</CardTitle>
        <CardDescription>Add/remove users (coming soon). Invite emails below to prepare.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Input
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder="team1@example.com, team2@example.com"
            maxLength={500}
            disabled={loading}
          />
          <p className="text-sm text-muted-foreground mt-1">
            Separate multiple emails with commas. Maximum 10 invites.
            {isAdmin && " (Admin: All team invites will be processed with admin privileges)"}
          </p>
        </div>
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {emails.split(',').filter(e => e.trim().length > 0).length} email(s) prepared
          </div>
          <div className="flex gap-2">
            {hasChanges && (
              <Button
                variant="outline"
                onClick={() => setEmails(savedEmails)}
                disabled={loading}
              >
                Reset
              </Button>
            )}
            <Button
              onClick={save}
              disabled={loading || !hasChanges}
            >
              {loading ? 'Saving...' : 'Save Invites'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamManagement;
