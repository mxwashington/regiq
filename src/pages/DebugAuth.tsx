import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { runDatabaseDiagnostics } from '@/utils/database-test';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

interface DiagnosticResults {
  supabaseClient: boolean;
  basicQuery: boolean;
  authTest: boolean;
  profilesTable: boolean;
  alertsTable: boolean;
  rpcFunctions: boolean;
  errors: string[];
}

export default function DebugAuth() {
  const { user, session, loading, isHealthy, lastError } = useAuth();
  const [diagnostics, setDiagnostics] = useState<DiagnosticResults | null>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);

  const runDiagnostics = async () => {
    setDiagnosticsLoading(true);
    try {
      const results = await runDatabaseDiagnostics();
      setDiagnostics(results);
    } catch (e) {
      console.error('Diagnostics failed:', e);
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <AlertCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getStatusBadge = (status: boolean) => {
    return status ? (
      <Badge variant="default" className="bg-green-100 text-green-800">Pass</Badge>
    ) : (
      <Badge variant="destructive">Fail</Badge>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Authentication & Database Debug</h1>
        <p className="text-muted-foreground">System diagnostics for emergency troubleshooting</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Auth Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(isHealthy)}
              Authentication Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span>Loading State:</span>
              {loading ? <Badge variant="secondary">Loading...</Badge> : <Badge variant="default">Ready</Badge>}
            </div>
            <div className="flex justify-between items-center">
              <span>Health Status:</span>
              {getStatusBadge(isHealthy)}
            </div>
            <div className="flex justify-between items-center">
              <span>User Session:</span>
              {getStatusBadge(!!user)}
            </div>
            <div className="flex justify-between items-center">
              <span>Session Data:</span>
              {getStatusBadge(!!session)}
            </div>
            {lastError && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-sm text-red-700">{lastError}</p>
              </div>
            )}
            {user && (
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <p className="text-sm text-green-700">
                  User ID: {user.id}<br />
                  Email: {user.email}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Database Diagnostics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Database Diagnostics
              <Button
                variant="ghost"
                size="sm"
                onClick={runDiagnostics}
                disabled={diagnosticsLoading}
              >
                <RefreshCw className={`h-4 w-4 ${diagnosticsLoading ? 'animate-spin' : ''}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {diagnosticsLoading && (
              <div className="text-center py-4">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p>Running diagnostics...</p>
              </div>
            )}

            {diagnostics && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Supabase Client:</span>
                  {getStatusBadge(diagnostics.supabaseClient)}
                </div>
                <div className="flex justify-between items-center">
                  <span>Basic Query:</span>
                  {getStatusBadge(diagnostics.basicQuery)}
                </div>
                <div className="flex justify-between items-center">
                  <span>Auth Functions:</span>
                  {getStatusBadge(diagnostics.authTest)}
                </div>
                <div className="flex justify-between items-center">
                  <span>Profiles Table:</span>
                  {getStatusBadge(diagnostics.profilesTable)}
                </div>
                <div className="flex justify-between items-center">
                  <span>Alerts Table:</span>
                  {getStatusBadge(diagnostics.alertsTable)}
                </div>
                <div className="flex justify-between items-center">
                  <span>RPC Functions:</span>
                  {getStatusBadge(diagnostics.rpcFunctions)}
                </div>

                {diagnostics.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded p-3 mt-4">
                    <h4 className="font-medium text-red-800 mb-2">Errors Found:</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {diagnostics.errors.map((error, index) => (
                        <li key={index}>{index + 1}. {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Information */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Auth Context:</strong> SafeAuthProvider (Emergency Mode)
            </div>
            <div>
              <strong>User Agent:</strong> {navigator.userAgent.substring(0, 50)}...
            </div>
            <div>
              <strong>Timestamp:</strong> {new Date().toISOString()}
            </div>
            <div>
              <strong>Environment:</strong> Development
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}