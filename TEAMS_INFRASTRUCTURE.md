# Teams Tier Infrastructure Requirements

**Status:** 🚧 Not Implemented - Hidden from Production  
**Estimated Effort:** 2-3 weeks of focused development  
**Re-enable When:** 10+ paying customers request multi-user access

---

## Overview

The Teams tier ($49/seat, 3-seat minimum) is currently **hidden from production** because it requires significant backend infrastructure that doesn't exist yet. Individual tiers (Starter/Growth/Professional) are fully functional and ready to ship.

**Database:** Teams pricing exists in `plans` table (monthly/annual, per-seat metadata) ✅  
**Frontend:** Teams UI components exist but are filtered out ✅  
**Backend:** Organizations, pooled usage, multi-seat billing **NOT IMPLEMENTED** ❌

---

## 1. Database Schema Requirements

### 1.1 Organizations Table
```sql
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier (e.g., "acme-corp")
  
  -- Billing
  subscription_tier TEXT NOT NULL DEFAULT 'teams', -- Should always be 'teams' or higher
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'active', -- active, past_due, canceled
  
  -- Seat management
  total_seats INTEGER NOT NULL DEFAULT 3, -- Minimum 3, expandable
  used_seats INTEGER NOT NULL DEFAULT 1, -- Track how many seats are occupied
  price_per_seat_cents INTEGER NOT NULL DEFAULT 4900, -- $49.00
  
  -- Ownership
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  billing_email TEXT,
  
  CONSTRAINT seats_capacity CHECK (used_seats <= total_seats),
  CONSTRAINT minimum_seats CHECK (total_seats >= 3)
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "org_members_can_view_org"
ON public.organizations FOR SELECT
USING (
  id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "org_owners_can_update_org"
ON public.organizations FOR UPDATE
USING (owner_id = auth.uid());
```

### 1.2 Organization Members Table
```sql
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Role-based access control
  role TEXT NOT NULL DEFAULT 'member', -- owner, admin, member
  
  -- Invitation tracking
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  joined_at TIMESTAMPTZ,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, suspended, removed
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(organization_id, user_id)
);

-- Enable RLS
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "members_can_view_own_membership"
ON public.organization_members FOR SELECT
USING (user_id = auth.uid() OR organization_id IN (
  SELECT organization_id FROM public.organization_members 
  WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
));

CREATE POLICY "org_admins_can_manage_members"
ON public.organization_members FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);
```

### 1.3 Update Profiles Table
```sql
-- Add organization_id to profiles
ALTER TABLE public.profiles 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX idx_profiles_organization_id ON public.profiles(organization_id);

-- Function to auto-populate organization_id when user joins org
CREATE OR REPLACE FUNCTION public.sync_user_organization()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE public.profiles 
    SET organization_id = NEW.organization_id 
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_org_membership
AFTER INSERT OR UPDATE ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_organization();
```

---

## 2. Pooled Usage Tracking

### 2.1 Modify AI Usage Tracking
Currently usage is tracked per `user_id`. For Teams tier, usage must be **aggregated at the organization level**.

**File:** `src/hooks/useUsageLimits.tsx`

```typescript
// TODO: Teams tier requires organizations table and pooled usage tracking
// See TEAMS_INFRASTRUCTURE.md for full requirements

const checkAndLogUsage = async (
  usageType: 'ai_summary' | 'ai_search' | 'export' | 'api_call',
  userTier: 'starter' | 'growth' | 'professional' | 'teams'
): Promise<UsageLimitResult> => {
  if (!user?.id) {
    throw new Error('User not authenticated');
  }

  setChecking(true);
  try {
    const limits = getTierLimits(userTier);
    const limit = limits[`${usageType}s` as keyof typeof limits] as number;

    if (limit === -1) {
      return { allowed: true, current_usage: 0, limit: -1, period_end: '', message: 'Unlimited usage' };
    }

    // TODO: For Teams tier, aggregate usage across all organization members
    // const organizationId = await getOrganizationId(user.id);
    // if (organizationId && userTier === 'teams') {
    //   // Check pooled usage for entire organization
    //   return await checkOrganizationUsage(organizationId, usageType, limit);
    // }

    const { data, error } = await supabase.rpc('check_and_log_usage', {
      user_uuid: user.id,
      usage_type_param: usageType,
      limit_count: limit
    });

    // ... rest of existing logic
  }
};
```

### 2.2 Create Organization Usage RPC
```sql
-- Function to check organization-wide usage limits (Teams tier)
CREATE OR REPLACE FUNCTION public.check_and_log_org_usage(
  org_id UUID,
  usage_type_param TEXT,
  limit_count INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_usage INTEGER := 0;
  period_start_date TIMESTAMPTZ;
  period_end_date TIMESTAMPTZ;
  is_allowed BOOLEAN;
BEGIN
  -- Get current billing period
  SELECT period_start, period_end INTO period_start_date, period_end_date
  FROM public.get_current_billing_period_for_org(org_id);
  
  -- Aggregate usage across all organization members
  SELECT COALESCE(SUM(aut.count), 0) INTO current_usage
  FROM public.ai_usage_tracking aut
  JOIN public.profiles p ON p.user_id = aut.user_id
  WHERE p.organization_id = org_id
    AND aut.usage_type = usage_type_param
    AND aut.billing_period_start = period_start_date;
  
  -- Check if under limit
  is_allowed := current_usage < limit_count;
  
  -- If allowed, log the usage for current user
  IF is_allowed THEN
    INSERT INTO public.ai_usage_tracking (
      user_id, usage_type, count, billing_period_start, billing_period_end
    ) VALUES (
      auth.uid(), usage_type_param, 1, period_start_date, period_end_date
    );
    current_usage := current_usage + 1;
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', is_allowed,
    'current_usage', current_usage,
    'limit', limit_count,
    'period_end', period_end_date,
    'message', CASE
      WHEN is_allowed THEN 'Usage logged successfully'
      ELSE format('Organization %s limit reached (%s/%s). Contact admin to upgrade.', 
                  usage_type_param, current_usage, limit_count)
    END
  );
END;
$$;
```

---

## 3. Shared Resources

### 3.1 Shared Watchlists
```sql
-- Modify saved_items to support organization-level sharing
ALTER TABLE public.saved_items
ADD COLUMN organization_id UUID REFERENCES public.organizations(id),
ADD COLUMN is_shared BOOLEAN DEFAULT false,
ADD COLUMN shared_by UUID REFERENCES auth.users(id);

-- RLS: Members can view shared items from their org
CREATE POLICY "org_members_can_view_shared_items"
ON public.saved_items FOR SELECT
USING (
  user_id = auth.uid() OR
  (is_shared = true AND organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  ))
);
```

### 3.2 Team Activity Dashboard
```sql
CREATE TABLE public.team_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  activity_type TEXT NOT NULL, -- alert_saved, export_created, search_performed, etc.
  entity_type TEXT, -- alert, export, search
  entity_id TEXT,
  
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_can_view_team_activities"
ON public.team_activities FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);
```

---

## 4. Role-Based Permissions

### 4.1 Permission Matrix

| Action | Owner | Admin | Member |
|--------|-------|-------|--------|
| View org details | ✅ | ✅ | ✅ |
| View team activity | ✅ | ✅ | ✅ |
| Invite new members | ✅ | ✅ | ❌ |
| Remove members | ✅ | ✅ | ❌ |
| Change member roles | ✅ | ✅ | ❌ |
| Update billing | ✅ | ❌ | ❌ |
| Delete organization | ✅ | ❌ | ❌ |
| Add/remove seats | ✅ | ❌ | ❌ |

### 4.2 Helper Functions
```sql
-- Check if user has permission for action
CREATE OR REPLACE FUNCTION public.has_org_permission(
  org_id UUID,
  required_role TEXT -- 'owner', 'admin', 'member'
) RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND CASE required_role
        WHEN 'owner' THEN role = 'owner'
        WHEN 'admin' THEN role IN ('owner', 'admin')
        WHEN 'member' THEN role IN ('owner', 'admin', 'member')
        ELSE false
      END
  );
$$;
```

---

## 5. Team Invitation System

### 5.1 Invitation Flow
1. Admin/Owner generates invite link or sends email
2. Invitee clicks link → creates account (if needed) → joins org
3. Seat count increments automatically
4. Org owner gets notified

### 5.2 Invitation Tokens
```sql
CREATE TABLE public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  
  email TEXT NOT NULL, -- Email of invitee
  role TEXT NOT NULL DEFAULT 'member',
  
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Enable RLS
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_admins_can_manage_invitations"
ON public.organization_invitations FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);
```

### 5.3 Edge Function: Send Invitation Email
```typescript
// supabase/functions/send-team-invitation/index.ts
// TODO: Implement when Teams tier is enabled
// Sends email with magic link to join organization
```

---

## 6. Stripe Multi-Seat Billing

### 6.1 Seat Management Logic
```typescript
// File: supabase/functions/manage-team-seats/index.ts
// TODO: Teams tier requires Stripe per-seat billing implementation

import Stripe from 'stripe';

async function addSeatsToSubscription(
  organizationId: string,
  newTotalSeats: number
) {
  const org = await getOrganization(organizationId);
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  
  // Update subscription quantity in Stripe
  const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
  await stripe.subscriptions.update(org.stripe_subscription_id, {
    items: [{
      id: subscription.items.data[0].id,
      quantity: newTotalSeats // Prorated automatically by Stripe
    }]
  });
  
  // Update local DB
  await supabase
    .from('organizations')
    .update({ total_seats: newTotalSeats })
    .eq('id', organizationId);
}
```

### 6.2 Checkout Modifications
```typescript
// File: supabase/functions/create-checkout/index.ts
// TODO: Teams tier requires per-seat checkout logic

if (tier === 'teams') {
  const seatCount = body.seatCount || 3; // Minimum 3 seats
  
  const session = await stripe.checkout.sessions.create({
    customer_email: user.email,
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: 'RegIQ Teams' },
        unit_amount: 4900, // $49 per seat
        recurring: { interval: 'month' }
      },
      quantity: seatCount // Per-seat billing
    }],
    mode: 'subscription',
    success_url: `${origin}/teams/onboarding?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing`,
    metadata: {
      plan: 'teams',
      seat_count: seatCount
    }
  });
}
```

---

## 7. Admin Dashboard for Seat Management

### 7.1 UI Components Needed
- **File:** `src/pages/TeamSettings.tsx` (new)
  - View current seat usage (e.g., "7 of 10 seats used")
  - Add/remove seats with Stripe proration
  - Invite team members via email
  - View/manage existing members
  - View team activity feed

### 7.2 Example UI Structure
```typescript
// src/pages/TeamSettings.tsx
// TODO: Teams tier requires admin dashboard implementation
// See TEAMS_INFRASTRUCTURE.md Section 7 for full requirements

export default function TeamSettings() {
  const { organization, isLoading } = useOrganization();
  
  return (
    <div>
      <h1>Team Settings</h1>
      
      {/* Seat Management */}
      <Card>
        <CardHeader>Seat Usage</CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              {organization.used_seats} of {organization.total_seats} seats used
            </div>
            <Button onClick={() => setShowAddSeatsModal(true)}>
              Add Seats
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Team Members */}
      <Card>
        <CardHeader>Team Members</CardHeader>
        <CardContent>
          <TeamMembersList />
          <Button onClick={() => setShowInviteModal(true)}>
            Invite Member
          </Button>
        </CardContent>
      </Card>
      
      {/* Team Activity */}
      <Card>
        <CardHeader>Recent Team Activity</CardHeader>
        <CardContent>
          <TeamActivityFeed />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 8. Frontend Components Requiring Teams Logic

### 8.1 Files with TODO Comments Added

| File | Current State | Requires |
|------|--------------|----------|
| `src/hooks/usePlanLimits.tsx` | ✅ Teams tier limits defined | Organization-level usage aggregation |
| `src/hooks/useUsageLimits.tsx` | ✅ Teams tier limits defined | Organization-level usage aggregation |
| `src/hooks/useFeatureAccess.tsx` | ✅ Teams features gated | Role-based permission checks |
| `src/components/marketing/NewPricingSection.tsx` | 🚫 Teams tier hidden | Re-enable when backend ready |
| `supabase/functions/create-checkout/index.ts` | ⚠️ Teams checkout stub exists | Per-seat quantity logic |

---

## 9. Testing Requirements

### 9.1 Unit Tests
- [ ] Organization CRUD operations
- [ ] Pooled usage tracking calculations
- [ ] Seat limit enforcement (min 3, max as configured)
- [ ] Role-based permission checks
- [ ] Invitation token generation/expiration

### 9.2 Integration Tests
- [ ] User invitation flow end-to-end
- [ ] Stripe per-seat billing with proration
- [ ] Shared watchlist visibility across org
- [ ] Team activity feed updates in real-time

### 9.3 Load Tests
- [ ] 50+ member organization query performance
- [ ] Concurrent usage logging from multiple team members
- [ ] Dashboard refresh with large activity feeds

---

## 10. Re-Enablement Checklist

Before unhiding Teams tier from production:

- [ ] All database tables created (organizations, organization_members)
- [ ] RLS policies tested and verified
- [ ] Pooled usage tracking implemented and tested
- [ ] Stripe per-seat billing working with proration
- [ ] Team invitation flow end-to-end functional
- [ ] Admin dashboard for seat management deployed
- [ ] Role-based permissions enforced in UI
- [ ] Shared watchlists/alerts functional
- [ ] Team activity feed displays correctly
- [ ] Load testing passed for 50+ member orgs
- [ ] Documentation updated with team onboarding guide
- [ ] Customer success trained on Teams tier features

---

## 11. Estimated Effort Breakdown

| Phase | Tasks | Effort |
|-------|-------|--------|
| **Phase 1: Database** | Organizations + members tables, RLS | 3-4 days |
| **Phase 2: Pooled Usage** | Org-level usage tracking, RPC functions | 2-3 days |
| **Phase 3: Stripe Integration** | Per-seat billing, quantity updates | 2-3 days |
| **Phase 4: Team Features** | Shared watchlists, activity feed | 3-4 days |
| **Phase 5: Admin UI** | Seat management dashboard | 2-3 days |
| **Phase 6: Invitations** | Email invites, token flow | 2 days |
| **Phase 7: Testing** | Unit + integration + load tests | 3 days |
| **Total** | | **17-22 days** (2.5-3 weeks) |

---

## 12. Decision Criteria for Re-Enablement

**Enable Teams tier when:**

✅ **Customer Demand Validated**
- 10+ paying customers explicitly request multi-user access
- Clear use cases documented (e.g., QA team of 5, multi-facility operations)

✅ **Technical Readiness**
- All checklist items in Section 10 completed
- Load testing confirms performance at scale
- Security audit passed for org-level data access

✅ **Business Readiness**
- Customer success trained on Teams tier onboarding
- Billing support prepared for per-seat proration questions
- Legal review of multi-user agreement terms

**Until then:** Individual tiers (Starter/Growth/Professional) provide full value to target customers.

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Maintained By:** Engineering Team