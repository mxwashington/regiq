import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/SafeAuthContext';
import { Send, Loader2, MessageCircle, HelpCircle, Bug, Lightbulb } from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSubmitting: boolean;
  setIsSubmitting: (submitting: boolean) => void;
}

interface SupportFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const SUPPORT_SUBJECTS = [
  { value: 'bug', label: 'Bug Report', icon: Bug },
  { value: 'feature', label: 'Feature Request', icon: Lightbulb },
  { value: 'help', label: 'General Help', icon: HelpCircle },
  { value: 'account', label: 'Account Issues', icon: MessageCircle },
  { value: 'other', label: 'Other', icon: MessageCircle },
];

export function SupportModal({ isOpen, onClose, isSubmitting, setIsSubmitting }: SupportModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<SupportFormData>({
    name: '',
    email: user?.email || '',
    subject: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Here you would normally call your API endpoint
      // For now, we'll simulate the request
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: 'Support Request Sent',
        description: 'We received your message and will respond within 24 hours.',
      });

      // Reset form
      setFormData({
        name: '',
        email: user?.email || '',
        subject: '',
        message: ''
      });
      
      onClose();
    } catch (error) {
      toast({
        title: 'Failed to Send',
        description: 'There was an error sending your support request. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof SupportFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            Contact Support
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="support-name">Name *</Label>
              <Input
                id="support-name"
                type="text"
                placeholder="Your full name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            <div>
              <Label htmlFor="support-email">Email *</Label>
              <Input
                id="support-email"
                type="email"
                placeholder="your.email@company.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            <div>
              <Label htmlFor="support-subject">Subject *</Label>
              <Select 
                value={formData.subject} 
                onValueChange={(value) => handleInputChange('subject', value)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="support-subject">
                  <SelectValue placeholder="Select a topic" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORT_SUBJECTS.map((subject) => {
                    const Icon = subject.icon;
                    return (
                      <SelectItem key={subject.value} value={subject.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {subject.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="support-message">Message *</Label>
              <Textarea
                id="support-message"
                placeholder="Please describe your issue or question in detail..."
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                rows={4}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          {/* Quick Help Links */}
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground mb-2">
                Need immediate help? Try these resources:
              </div>
              <div className="space-y-1">
                <Button variant="link" className="p-0 h-auto text-xs text-blue-600" asChild>
                  <a href="/help" target="_blank">Documentation & FAQ</a>
                </Button>
                <br />
                <Button variant="link" className="p-0 h-auto text-xs text-blue-600" asChild>
                  <a href="/api-docs" target="_blank">API Documentation</a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.name || !formData.email || !formData.subject || !formData.message}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}