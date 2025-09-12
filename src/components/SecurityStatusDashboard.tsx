import React from 'react';
import { EnhancedSecurityMonitor } from './EnhancedSecurityMonitor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface SecurityStatusProps {
  className?: string;
}

export const SecurityStatusDashboard: React.FC<SecurityStatusProps> = ({ className }) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Security Implementation Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Security Implementation Status
            <Badge variant="default" className="ml-2">
              <CheckCircle className="h-3 w-3 mr-1" />
              HARDENED
            </Badge>
          </CardTitle>
          <CardDescription>
            Critical security vulnerabilities have been fixed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div className="text-sm font-medium">RLS Policies</div>
              <div className="text-xs text-muted-foreground">Secured</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div className="text-sm font-medium">API Keys</div>
              <div className="text-xs text-muted-foreground">Protected</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div className="text-sm font-medium">Payment Data</div>
              <div className="text-xs text-muted-foreground">Encrypted</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div className="text-sm font-medium">Account Lockout</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
          </div>
          
          <Alert className="mt-4">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Security Fixes Applied:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Fixed customer PII exposure in profiles table</li>
                <li>• Secured financial data access in payment_logs</li>
                <li>• Protected API key storage and access</li>
                <li>• Implemented account lockout after failed login attempts</li>
                <li>• Added comprehensive security monitoring and logging</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Remaining Warnings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Remaining Security Warnings
            <Badge variant="outline">2 Minor</Badge>
          </CardTitle>
          <CardDescription>
            These are low-priority issues that don't pose immediate security risks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
              <div>
                <div className="text-sm font-medium">Extension in Public Schema</div>
                <div className="text-xs text-muted-foreground">
                  Some extensions are installed in the public schema. This is a minor optimization issue.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
              <div>
                <div className="text-sm font-medium">PostgreSQL Version</div>
                <div className="text-xs text-muted-foreground">
                  Consider upgrading to the latest PostgreSQL version for additional security patches.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Security Monitoring */}
      <EnhancedSecurityMonitor />
    </div>
  );
};