# Teams Tier Hidden from Production

**Date:** January 2025  
**Status:** ✅ COMPLETE  
**Decision:** Launch with 3 tiers only (Starter, Growth, Professional)

---

## What Was Done

### ✅ Teams Tier Hidden from UI
- **File:** `src/components/marketing/NewPricingSection.tsx`
  - Teams tier commented out in plans array
  - Changed grid layout from `lg:grid-cols-4` to `lg:grid-cols-3`
  - Removed Teams pricing note from bottom of page
  - Added TODO comment pointing to TEAMS_INFRASTRUCTURE.md

- **File:** `src/pages/Pricing.tsx`
  - Removed Teams from SEO meta title and description
  - Removed Teams from Schema.org structured data
  - Updated canonical to reflect 3-tier structure

- **File:** `supabase/functions/create-checkout/index.ts`
  - Commented out Teams tier from plan map
  - Added TODO comment for per-seat billing requirements

### ✅ Backend TODO Comments Added
Added implementation notes in:
- `src/hooks/useUsageLimits.tsx` - Organization-level usage aggregation needed
- `src/hooks/useFeatureAccess.tsx` - Role-based permissions needed
- `supabase/functions/create-checkout/index.ts` - Per-seat billing logic needed

All comments reference `TEAMS_INFRASTRUCTURE.md` for full requirements.

### ✅ Database Data Preserved
**NO database changes made.** All Teams tier data remains intact:
- `plans` table rows for `teams` and `teams_annual` unchanged
- `min_seats` column preserved (value: 3)
- `per_seat_pricing` column preserved (value: true)
- Pricing data preserved ($49/seat monthly, $490/seat annual)

### ✅ Documentation Created
- **TEAMS_INFRASTRUCTURE.md** - Comprehensive 2,500+ word guide covering:
  - Database schema requirements (organizations, organization_members)
  - Pooled usage tracking implementation
  - Stripe per-seat billing logic
  - Shared resources (watchlists, activity feed)
  - Role-based permissions (owner/admin/member)
  - Team invitation system
  - Admin dashboard UI requirements
  - Re-enablement checklist (10 items)
  - Estimated effort: 17-22 days (2.5-3 weeks)

---

## Launch Configuration

### ✅ Production Tiers (Visible)
1. **Starter** - $0/month (Free)
2. **Growth** - $29/month
3. **Professional** - $199/month (MOST POPULAR)

### 🚫 Hidden Tier (Not Visible)
4. **Teams** - $49/seat/month (3-seat minimum = $147)
   - Database: ✅ Ready
   - Frontend: ✅ Hidden
   - Backend: ❌ Not implemented

---

## Re-Enablement Process

When ready to launch Teams tier:

### Step 1: Build Backend Infrastructure
Follow `TEAMS_INFRASTRUCTURE.md` sections 1-7:
1. Create `organizations` table
2. Create `organization_members` table  
3. Implement pooled usage tracking
4. Add Stripe per-seat billing
5. Build team invitation system
6. Create admin dashboard
7. Implement role-based permissions

### Step 2: Uncomment Teams Tier in Code
```typescript
// In src/components/marketing/NewPricingSection.tsx
const plans: PricingPlan[] = [
  { id: 'starter', ... },
  { id: 'growth', ... },
  { id: 'professional', ... },
  { id: 'teams', ... }, // Uncomment this
];
```

Update grid back to 4 columns:
```typescript
<div className="relative grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-6 mt-20 overflow-visible">
```

### Step 3: Update SEO/Marketing
- Add Teams back to Pricing page title
- Update meta description
- Add Teams to Schema.org structured data
- Uncomment pricing note about per-seat scaling

### Step 4: Enable in Checkout
```typescript
// In supabase/functions/create-checkout/index.ts
const planMap: Record<string, { amount: number; name: string }> = {
  // ...
  teams: { amount: 14700, name: "RegIQ Teams (3 seats minimum)" }, // Uncomment
};
```

Implement per-seat quantity logic (see TEAMS_INFRASTRUCTURE.md Section 6.2).

### Step 5: Testing Checklist
- [ ] Create test organization with 3 users
- [ ] Verify pooled usage tracking works
- [ ] Test seat addition/removal with proration
- [ ] Test team invitation flow
- [ ] Verify shared watchlists visible to all org members
- [ ] Test role-based permission enforcement
- [ ] Load test with 50+ member organization

---

## Decision Criteria for Re-Enablement

**Enable Teams tier when ALL of the following are true:**

✅ **Customer Demand Validated**
- 10+ paying customers explicitly request multi-user access
- Clear use cases documented

✅ **Technical Readiness**
- All backend infrastructure implemented (organizations, pooled usage, etc.)
- Load testing passed for 50+ member orgs
- Security audit completed

✅ **Business Readiness**
- Customer success trained on Teams onboarding
- Billing support prepared for per-seat questions
- Legal review of multi-user agreement

---

## Rationale for Hiding

**Why hide Teams tier now?**

1. **Focus on Proven Value**
   - Individual tiers (Starter/Growth/Professional) are 100% functional
   - No need to build complex infrastructure until demand proven

2. **Avoid Customer Confusion**
   - Backend features (shared watchlists, team dashboard) don't work yet
   - Better to underpromise and overdeliver later

3. **Resource Allocation**
   - 2-3 weeks of dev effort for uncertain ROI
   - Better to optimize conversion on individual tiers first

4. **Clean Launch**
   - Launch with what works perfectly
   - Add Teams tier when 10+ customers ask for it

**Timeline:**
- **Now → Month 2:** Launch with 3 tiers, validate conversion
- **Month 3+:** Build Teams tier if customer demand warrants it

---

## Files Modified

### Frontend:
- ✅ `src/components/marketing/NewPricingSection.tsx` - Hidden Teams, added TODOs
- ✅ `src/pages/Pricing.tsx` - Updated SEO, removed Teams from structured data

### Backend:
- ✅ `supabase/functions/create-checkout/index.ts` - Commented Teams, added TODO

### Hooks:
- ✅ `src/hooks/useUsageLimits.tsx` - Added TODO for org-level aggregation
- ✅ `src/hooks/useFeatureAccess.tsx` - Added TODO for Teams features

### Documentation:
- ✅ `TEAMS_INFRASTRUCTURE.md` - Comprehensive implementation guide (NEW)
- ✅ `TEAMS_TIER_HIDDEN.md` - This document (NEW)

---

## Database Status

**NO CHANGES MADE** - All Teams tier data preserved:

```sql
-- Verify Teams pricing is still in database:
SELECT plan_id, name, price_cents, min_seats, per_seat_pricing 
FROM public.plans 
WHERE plan_id LIKE 'teams%';

-- Expected output:
-- teams         | Teams | 4900   | 3         | true
-- teams_annual  | Teams | 49000  | 3         | true
```

---

## Customer-Facing Impact

**What customers see:**
- ✅ 3 clear pricing tiers (Free, $29, $199)
- ✅ No mentions of Teams or multi-user plans
- ✅ No broken "Contact Sales" CTAs
- ✅ No references to features that don't work

**What customers get:**
- ✅ Fully functional individual plans
- ✅ All promised features working perfectly
- ✅ No confusion about "coming soon" features

---

## Next Steps

1. **Launch with 3 tiers** ✅ READY
2. **Monitor conversion metrics** for Starter → Growth → Professional
3. **Track customer requests** for multi-user access
4. **Build Teams tier** when 10+ customers ask for it
5. **Re-enable Teams** following re-enablement checklist above

---

**Status:** Ready for production launch with 3 tiers.  
**Teams tier:** Preserved in database, hidden from UI, documented for future implementation.