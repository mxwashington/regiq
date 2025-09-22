import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchFoodSafetyDocuments, RegulatoryDocument } from '@/services/regulatoryService';

const DashboardRegulatoryWidget = () => {
  const [featuredUpdates, setFeaturedUpdates] = useState<RegulatoryDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFeaturedUpdates = async () => {
      try {
        const updates = await fetchFoodSafetyDocuments();
        // Show 2 most recent updates on dashboard
        setFeaturedUpdates(updates.slice(0, 2));
      } catch (error) {
        console.error('Failed to load regulatory updates:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedUpdates();
  }, []);

  if (loading) {
    return (
      <div className="bg-card rounded-lg p-4 shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/2 mb-3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-muted rounded w-full"></div>
            <div className="h-3 bg-muted rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-4 shadow">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-card-foreground">Latest Safety Updates</h3>
        <Link to="/regulatory-news" className="text-primary text-sm hover:text-primary/80 transition-colors">
          View all →
        </Link>
      </div>

      <div className="space-y-3">
        {featuredUpdates.length === 0 ? (
          <p className="text-muted-foreground text-sm">No updates available</p>
        ) : (
          featuredUpdates.map(update => (
            <div key={update.id} className="border-l-4 border-primary pl-3 py-2">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-medium text-primary">{update.agency}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(update.postedDate).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-card-foreground line-clamp-2">{update.consumerImpact}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DashboardRegulatoryWidget;