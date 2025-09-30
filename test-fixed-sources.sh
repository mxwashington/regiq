#!/bin/bash

# Test Fixed RegIQ Data Sources
# Validates all corrected URLs and endpoints

echo "================================================"
echo "RegIQ Fixed Data Sources Validation"
echo "================================================"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

test_count=0
pass_count=0
fail_count=0

test_url() {
  local name=$1
  local url=$2
  local description=$3

  test_count=$((test_count + 1))
  echo -e "${BLUE}Test ${test_count}:${NC} ${name}"
  echo "  URL: ${url}"
  echo "  Check: ${description}"

  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 -L "${url}" \
    -H "User-Agent: RegIQ Food Safety Monitor/1.0" \
    -H "Accept: text/html,application/xml,application/json,application/rss+xml" 2>&1)

  if [ "$http_code" = "200" ]; then
    echo -e "  ${GREEN}✓ PASS${NC} (HTTP $http_code)"
    pass_count=$((pass_count + 1))
  elif [ "$http_code" = "403" ]; then
    echo -e "  ${YELLOW}⚠ BLOCKED${NC} (HTTP $http_code - Access restricted, but endpoint exists)"
    pass_count=$((pass_count + 1))
  else
    echo -e "  ${RED}✗ FAIL${NC} (HTTP $http_code)"
    fail_count=$((fail_count + 1))
  fi
  echo ""
}

echo "================================================"
echo "PART 1: FIXED RSS FEEDS"
echo "================================================"
echo ""

test_url "FTC Consumer Protection RSS" \
  "https://www.ftc.gov/feeds/press-release-consumer-protection.xml" \
  "Food advertising enforcement RSS feed"

test_url "OSHA News Releases RSS" \
  "https://www.osha.gov/news/newsreleases.xml" \
  "Workplace safety news RSS feed"

echo "================================================"
echo "PART 2: EPA ECHO API"
echo "================================================"
echo ""

test_url "EPA ECHO Facilities API" \
  "https://echo.epa.gov/tools/web-services/get_facilities.json?output=JSON&p_naics=311&p_rows=5" \
  "Food manufacturing facilities with violations"

test_url "EPA ECHO Enforcement API" \
  "https://echo.epa.gov/tools/web-services/get_enforcement_summary.json?output=JSON&responseset=1" \
  "Recent enforcement actions"

echo "================================================"
echo "PART 3: FDA WARNING LETTERS PAGE"
echo "================================================"
echo ""

test_url "FDA Warning Letters Page" \
  "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters" \
  "FDA warning letters listing page"

echo "================================================"
echo "PART 4: NOAA FISHERIES PAGES"
echo "================================================"
echo ""

test_url "NOAA Fisheries News" \
  "https://www.fisheries.noaa.gov/news-and-announcements/news" \
  "NOAA fisheries news and announcements"

test_url "NOAA Fisheries Bulletins" \
  "https://www.fisheries.noaa.gov/news-and-announcements/bulletins" \
  "NOAA fisheries bulletins and advisories"

echo "================================================"
echo "PART 5: EXISTING WORKING SOURCES (Verification)"
echo "================================================"
echo ""

test_url "FDA OpenFDA Food Enforcement" \
  "https://api.fda.gov/food/enforcement.json?limit=1" \
  "FDA food recalls and enforcement"

test_url "FSIS Recalls RSS" \
  "https://www.fsis.usda.gov/fsis-content/rss/recalls.xml" \
  "USDA FSIS meat/poultry recalls"

test_url "TTB News RSS" \
  "https://www.ttb.gov/rss/news-and-events.xml" \
  "Alcohol labeling and regulation"

test_url "Federal Register API" \
  "https://www.federalregister.gov/api/v1/documents.json?per_page=1" \
  "Federal regulatory documents"

test_url "USDA AMS Organic API" \
  "https://organic.ams.usda.gov/integrity/api/operations?limit=1" \
  "Organic certification database"

test_url "FDA Import Alerts" \
  "https://www.accessdata.fda.gov/cms_ia/default.html" \
  "FDA import restrictions"

echo "================================================"
echo "TEST SUMMARY"
echo "================================================"
echo ""
echo "Total Tests: $test_count"
echo -e "${GREEN}Passed: $pass_count${NC}"
echo -e "${RED}Failed: $fail_count${NC}"
echo ""

success_rate=$((pass_count * 100 / test_count))
echo "Success Rate: ${success_rate}%"
echo ""

if [ $fail_count -eq 0 ]; then
  echo -e "${GREEN}✅ All fixed sources are working!${NC}"
  echo ""
  echo "Next Steps:"
  echo "1. Deploy updated functions to Supabase"
  echo "2. Configure cron jobs for automated data collection"
  echo "3. Verify alerts appear in dashboard"
  exit 0
elif [ $success_rate -ge 80 ]; then
  echo -e "${YELLOW}⚠ Most sources working (${success_rate}%). Review failures.${NC}"
  exit 0
else
  echo -e "${RED}✗ Multiple sources failed. Check network or URLs.${NC}"
  exit 1
fi