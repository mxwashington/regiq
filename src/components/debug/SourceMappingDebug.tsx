import { useState, useEffect } from 'react';
import { validateSourceMappings } from '@/lib/source-mapping';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SourceMappingDebugProps {
  className?: string;
}

export const SourceMappingDebug = ({ className }: SourceMappingDebugProps) => {
  const [validation, setValidation] = useState<Awaited<ReturnType<typeof validateSourceMappings>> | null>(null);
  const [loading, setLoading] = useState(false);

  const runValidation = async () => {
    setLoading(true);
    try {
      const result = await validateSourceMappings();
      setValidation(result);
      console.log('[Source Mapping Debug] Full validation results:', result);
    } catch (error) {
      console.error('[Source Mapping Debug] Validation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runValidation();
  }, []);

  if (!validation && !loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Source Mapping Debug</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={runValidation}>Run Validation</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Source Mapping Debug</CardTitle>
        <Button size="sm" onClick={runValidation} disabled={loading}>
          {loading ? 'Running...' : 'Refresh'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div>Running validation...</div>
        ) : (
          validation && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-green-700">Mapped Sources ({validation.mappedSources.length})</h4>
                <div className="text-sm space-y-1">
                  {validation.mappedSources.map(source => (
                    <div key={source} className="flex justify-between">
                      <span>{source}</span>
                      <span className="text-gray-500">
                        ({validation.sourceStats[source]?.count || 0} alerts)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {validation.unmappedSources.length > 0 && (
                <div>
                  <h4 className="font-semibold text-red-700">Unmapped Sources ({validation.unmappedSources.length})</h4>
                  <div className="text-sm space-y-1">
                    {validation.unmappedSources.map(source => (
                      <div key={source} className="flex justify-between">
                        <span>{source}</span>
                        <span className="text-gray-500">
                          ({validation.sourceStats[source]?.count || 0} alerts)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-semibold">Source Statistics</h4>
                <div className="text-sm space-y-1 max-h-40 overflow-y-auto">
                  {Object.entries(validation.sourceStats)
                    .sort(([,a], [,b]) => b.count - a.count)
                    .map(([source, stats]) => (
                      <div key={source} className="flex justify-between">
                        <span className="truncate">{source}</span>
                        <span className="text-gray-500">
                          {stats.count} alerts
                          {stats.sampleAgencies.length > 0 && (
                            <span className="ml-2 text-xs">
                              (agencies: {stats.sampleAgencies.join(', ')})
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
};