import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { extractKeywords } from '@/lib/alert-search';

export const KeywordExtractionDemo = () => {
  const testAlerts = [
    {
      title: "FDA Safety Alert: Voluntary Recall of Brand X Peanut Butter Due to Salmonella Contamination",
      agency: "FDA"
    },
    {
      title: "USDA Announces Recall of Select Beef Products from ABC Meat Company Due to Possible E. coli Contamination",
      agency: "USDA"
    },
    {
      title: "Albertsons Companies Stores in Arkansas, Louisiana, Oklahoma and Texas Voluntarily Recalls Select Items Containing Tuna Salad from Reser's Fine Foods Due to an Ingredient Recall Linked to Possible Listeria Monocytogenes Contamination",
      agency: "FDA"
    }
  ];

  return (
    <Card className="border-dashed border-green-200 bg-green-50/50">
      <CardHeader>
        <CardTitle className="text-lg">Keyword Extraction Examples</CardTitle>
        <CardDescription>
          See how noise words are removed for better search targeting
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {testAlerts.map((alert, index) => {
          const keywords = extractKeywords(alert.title);
          
          return (
            <div key={index} className="text-xs bg-white p-3 rounded border space-y-2">
              <div>
                <span className="font-medium text-gray-600">Original:</span>
                <div className="text-gray-800">{alert.title}</div>
              </div>
              <div>
                <span className="font-medium text-green-600">Extracted Keywords:</span>
                <div className="mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {keywords}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>Search Query:</span>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  {keywords} site:{alert.agency.toLowerCase()}.gov
                </code>
              </div>
            </div>
          );
        })}
        
        <div className="text-xs text-muted-foreground bg-green-100 p-2 rounded">
          <strong>✨ Improvements:</strong>
          <ul className="mt-1 space-y-1 ml-4">
            <li>• Removes regulatory jargon ("voluntary", "recall", "due to")</li>
            <li>• Filters out agency names (already in site: search)</li>
            <li>• Focuses on product names and contamination types</li>
            <li>• Shorter, more targeted search queries</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};