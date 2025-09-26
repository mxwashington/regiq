# RegIQ Admin Dashboard

A comprehensive, production-ready admin dashboard for managing the RegIQ regulatory alerts aggregation system.

## 🏗️ Architecture Overview

The admin dashboard is built using Next.js App Router with TypeScript, implementing a secure, scalable architecture:

- **Server-side Authentication**: JWT-based admin verification with role-based access control
- **Component Architecture**: Modular, reusable components with consistent error handling
- **API Layer**: RESTful endpoints with comprehensive validation and error handling
- **Database Layer**: Supabase with Row Level Security (RLS) and custom RPC functions
- **Type Safety**: Full TypeScript coverage with strict typing

## 🔐 Security Features

### Authentication & Authorization
- **Admin Guards**: Server-side verification using `requireAdmin()` function
- **JWT Verification**: Secure token validation with role checking
- **Row Level Security**: Database-level access control with emergency RLS toggles
- **Rate Limiting**: Client-side rate limiting to prevent abuse

### Security Best Practices
- Input sanitization and validation
- SQL injection prevention in RLS policies
- XSS protection through content escaping
- Secure error handling without information leakage

## 📋 Core Components

### 1. KPI Overview Cards (`KpiCards.tsx`)
- **Real-time Metrics**: Total alerts, 24-hour activity, system health
- **Sparkline Charts**: Visual trend data using Recharts
- **Health Indicators**: Source status with color-coded badges
- **Accessibility**: ARIA labels, screen reader announcements

### 2. Data Pipeline Controls (`SyncControls.tsx`)
- **Manual Sync**: Trigger immediate data synchronization
- **Backfill Operations**: Historical data retrieval (1-365 days)
- **Health Checks**: Automated system monitoring
- **Database Maintenance**: Deduplication and reindexing
- **Progress Tracking**: Real-time operation status with progress bars

### 3. Agency Management (`AgencyTable.tsx`)
- **Paginated Table**: Efficient handling of large datasets
- **Advanced Filtering**: Search, source, status, jurisdiction filters
- **CSV Export**: Bulk data export with proper escaping
- **Status Monitoring**: Agency health and sync failure tracking

### 4. Health Monitoring (`HealthTable.tsx`)
- **Real-time Status**: Live health checks with auto-refresh
- **Performance Metrics**: Latency, success rates, failure counts
- **Historical Data**: 24-hour performance analytics
- **Auto-refresh**: Configurable automatic updates (30-second intervals)

### 5. Sync Logs (`LogsTable.tsx`)
- **Comprehensive Logging**: All sync operations with full details
- **Advanced Filtering**: Date range, source, status, trigger type
- **Error Analysis**: Detailed error and warning information
- **Real-time Updates**: Live log streaming with auto-refresh

### 6. Duplicate Management (`DuplicatesWidget.tsx`)
- **Intelligent Detection**: External ID and similarity-based matching
- **Batch Operations**: Remove all duplicates or specific groups
- **Space Optimization**: Calculate and display storage savings
- **Detailed Analysis**: Individual duplicate group inspection

### 7. System Settings (`SettingsPanel.tsx`)
- **Configuration Management**: Sync schedules, retention policies
- **RLS Policy Management**: Create, modify, enable/disable security policies
- **User Administration**: Admin user management with role assignment
- **Database Operations**: Vacuum, reindex, and maintenance tools

## 🛠️ API Endpoints

### Core Operations
- `GET /api/admin/metrics` - KPI and dashboard metrics
- `POST /api/admin/sync` - Manual synchronization
- `POST /api/admin/backfill` - Historical data backfill
- `GET /api/admin/health` - System health status
- `POST /api/admin/health` - Trigger health check

### Data Management
- `GET /api/admin/agencies` - Agency listing with filters
- `GET /api/admin/logs` - Sync logs with filtering
- `GET /api/admin/duplicates` - Duplicate groups
- `POST /api/admin/duplicates` - Scan for duplicates
- `DELETE /api/admin/duplicates/[id]` - Remove duplicate group

### System Administration
- `GET /api/admin/settings` - System configuration
- `POST /api/admin/rls` - Emergency RLS controls
- `POST /api/admin/dedupe` - Deduplication operations
- `POST /api/admin/reindex` - Database reindexing

## 🗄️ Database Functions

### Core Admin Functions
- `get_sources_health()` - Source status and performance metrics
- `get_daily_alert_counts()` - Sparkline data generation
- `count_potential_duplicates()` - Duplicate detection counting
- `get_health_status()` - Comprehensive health monitoring

### Operation Functions
- `trigger_manual_sync()` - Initiate manual synchronization
- `trigger_backfill()` - Historical data backfill
- `deduplicate_alerts()` - Remove duplicate records
- `reindex_database()` - Database optimization
- `run_health_check()` - System health verification

### Management Functions
- `get_agencies_with_stats()` - Agency data with statistics
- `get_duplicate_groups()` - Duplicate group analysis
- `get_database_stats()` - Database size and metrics

## ♿ Accessibility Features

### WCAG 2.1 AA Compliance
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: ARIA labels and live regions
- **Color Contrast**: WCAG AA compliant color schemes
- **Focus Management**: Proper focus trapping and indicators

### Assistive Technology Support
- **Screen Reader Announcements**: Status changes and loading states
- **Keyboard Shortcuts**: Efficient navigation patterns
- **High Contrast Mode**: Support for user preferences
- **Reduced Motion**: Respect for motion sensitivity

## 🔧 Error Handling

### Comprehensive Error Management
- **Typed Errors**: Custom `AdminError` class with detailed information
- **User-Friendly Messages**: Clear, actionable error descriptions
- **Retry Logic**: Automatic retry for transient failures
- **Rate Limiting**: Client-side request throttling

### Validation Framework
- **Input Validation**: Comprehensive form and data validation
- **Security Validation**: SQL injection and XSS prevention
- **Business Logic Validation**: Domain-specific rule enforcement

## 📊 Data Export

### CSV Export Features
- **Safe Generation**: Proper CSV escaping and formatting
- **Predefined Schemas**: Ready-to-use column definitions
- **Large Dataset Support**: Chunked processing for performance
- **Batch Operations**: Export filtered and paginated data

### Export Types
- **Alerts Export**: Full alert data with metadata
- **Sync Logs Export**: Operation history and performance
- **Health Reports**: System status and metrics
- **Agency Reports**: Agency statistics and performance

## 🎨 UI/UX Features

### Design System
- **shadcn/ui Components**: Consistent, accessible component library
- **Tailwind CSS**: Utility-first styling with custom design tokens
- **Responsive Design**: Mobile-first, adaptive layouts
- **Dark Mode**: Full dark theme support

### User Experience
- **Progressive Loading**: Skeleton states and incremental loading
- **Real-time Updates**: Live data updates and progress tracking
- **Contextual Help**: Tooltips and descriptive messaging
- **Keyboard Shortcuts**: Power user efficiency features

## 🚀 Performance Optimizations

### Frontend Performance
- **Code Splitting**: Route-based and component-based splitting
- **Lazy Loading**: Deferred loading of non-critical components
- **Memoization**: React.memo and useMemo optimizations
- **Virtual Scrolling**: Efficient handling of large datasets

### Backend Performance
- **Database Indexing**: Optimized queries with proper indexes
- **Connection Pooling**: Efficient database connection management
- **Caching Strategy**: Strategic caching of expensive operations
- **Pagination**: Server-side pagination for large datasets

## 🧪 Testing Strategy

### Component Testing
- **Unit Tests**: Individual component functionality
- **Integration Tests**: Component interaction testing
- **Accessibility Tests**: WCAG compliance verification
- **Visual Regression**: UI consistency testing

### API Testing
- **Endpoint Testing**: Comprehensive API validation
- **Error Handling**: Error scenario testing
- **Security Testing**: Authentication and authorization
- **Performance Testing**: Load and stress testing

## 📋 Future Enhancements

### Planned Features
- **Advanced Analytics**: Trend analysis and forecasting
- **Custom Dashboards**: User-configurable dashboard layouts
- **Notification System**: Email and webhook notifications
- **Audit Logging**: Comprehensive operation tracking

### Performance Improvements
- **Real-time Subscriptions**: WebSocket-based live updates
- **Advanced Caching**: Redis integration for performance
- **Background Jobs**: Queue-based operations for heavy tasks
- **Monitoring Integration**: Application performance monitoring

## 🔄 Deployment

### Prerequisites
- Node.js 18+ with npm/yarn
- Supabase project with proper database setup
- Environment variables configured
- Admin user roles configured in database

### Setup Steps
1. **Database Setup**: Run admin-functions.sql to create required functions
2. **Environment Configuration**: Set up authentication and database connections
3. **Build Process**: Standard Next.js build and deployment
4. **Security Configuration**: Configure RLS policies and admin roles

### Production Considerations
- **Load Balancing**: Multi-instance deployment support
- **Database Scaling**: Connection pooling and read replicas
- **Monitoring**: Error tracking and performance monitoring
- **Backup Strategy**: Regular database backups and recovery procedures

## 📚 Documentation

### Code Documentation
- **TypeScript Types**: Comprehensive type definitions
- **JSDoc Comments**: Function and component documentation
- **README Files**: Setup and usage instructions
- **API Documentation**: Endpoint specifications and examples

### User Documentation
- **Admin Guide**: Feature usage and best practices
- **Troubleshooting**: Common issues and solutions
- **Security Guide**: Security features and configurations
- **Performance Guide**: Optimization recommendations

---

*This admin dashboard provides a robust, secure, and user-friendly interface for managing the RegIQ regulatory alerts system, with comprehensive features for monitoring, administration, and data management.*