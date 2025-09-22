import { useState, useEffect } from 'react';
import { RefreshCw, BookmarkPlus, Share2 } from 'lucide-react';
import { fetchFoodSafetyDocuments, RegulatoryDocument } from '@/services/regulatoryService';

const RegulatoryNews = () => {
  const [regulatoryUpdates, setRegulatoryUpdates] = useState<RegulatoryDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadRegulatoryUpdates();
  }, []);

  const loadRegulatoryUpdates = async () => {
    setLoading(true);
    try {
      const updates = await fetchFoodSafetyDocuments();
      setRegulatoryUpdates(updates);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load regulatory updates:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary">Safety News & Updates</h1>
        <button
          onClick={loadRegulatoryUpdates}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="text-sm text-muted-foreground mb-4">
        Last updated: {lastUpdated.toLocaleTimeString()}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg p-4 shadow animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {regulatoryUpdates.length === 0 ? (
            <div className="bg-card rounded-lg p-6 text-center">
              <p className="text-muted-foreground">No regulatory updates available at the moment.</p>
              <button
                onClick={loadRegulatoryUpdates}
                className="mt-4 text-primary hover:text-primary/80"
              >
                Try refreshing
              </button>
            </div>
          ) : (
            regulatoryUpdates.map((update) => (
              <RegulatoryUpdateCard key={update.id} update={update} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

const RegulatoryUpdateCard = ({ update }: { update: RegulatoryDocument }) => {
  const agencyColors = {
    FDA: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    USDA: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    EPA: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
  };

  return (
    <div className="bg-card rounded-lg p-4 shadow hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${agencyColors[update.agency as keyof typeof agencyColors] || 'bg-muted text-muted-foreground'}`}>
          {update.agency}
        </span>
        <span className="text-sm text-muted-foreground">
          {new Date(update.postedDate).toLocaleDateString()}
        </span>
      </div>

      <h3 className="font-semibold text-card-foreground mb-2 line-clamp-2">
        {update.title}
      </h3>

      <div className="space-y-3">
        <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">What this means for your grocery cart:</h4>
          <p className="text-blue-800 dark:text-blue-200 text-sm">{update.consumerImpact}</p>
        </div>

        <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
          <h4 className="font-medium text-green-900 dark:text-green-100 mb-1">Family Action:</h4>
          <p className="text-green-800 dark:text-green-200 text-sm">{update.familyAction}</p>
        </div>
      </div>

      <div className="flex justify-between items-center mt-4 pt-3 border-t">
        <button className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
          <BookmarkPlus className="w-4 h-4" />
          Save for later
        </button>
        <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <Share2 className="w-4 h-4" />
          Share
        </button>
      </div>
    </div>
  );
};

export default RegulatoryNews;