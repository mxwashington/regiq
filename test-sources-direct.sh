#!/bin/bash

# Direct connectivity test for all regulatory data sources
# Tests external endpoints without requiring Supabase

echo "================================================"
echo "RegIQ Direct Source Connectivity Test"
echo "================================================"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

test_count=0
pass_count=0
fail_count=0

test_url() {
  local name=$1
  local url=$2
  local expected_content=$3

  test_count=$((test_count + 1))
  echo -e "${YELLOW}Test ${test_count}:${NC} ${name}"
  echo "  URL: ${url}"

  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 -L "${url}" \
    -H "User-Agent: RegIQ-Test/1.0" \
    -H "Accept: text/html,application/xml,application/json" 2>&1)

  if [ "$http_code" = "200" ]; then
    echo -e "  ${GREEN}✓ PASS${NC} (HTTP $http_code - Endpoint accessible)"
    pass_count=$((pass_count + 1))
  elif [ "$http_code" = "403" ] || [ "$http_code" = "401" ]; then
    echo -e "  ${YELLOW}⚠ PARTIAL${NC} (HTTP $http_code - Needs authentication but endpoint exists)"
    pass_count=$((pass_count + 1))
  else
    echo -e "  ${RED}✗ FAIL${NC} (HTTP $http_code)"
    fail_count=$((fail_count + 1))
  fi
  echo ""
}

echo "================================================"
echo "PART 1: RSS FEEDS"
echo "================================================"
echo ""

test_url "CDC Food Safety RSS" \
  "https://www.cdc.gov/foodsafety/rss/foodsafety-RSS.xml"

test_url "FTC News RSS" \
  "https://www.ftc.gov/stay-connected/rss/all-news"

test_url "OSHA What's New RSS" \
  "https://www.osha.gov/rss/whatsnew.xml"

test_url "FSIS Recalls RSS" \
  "https://www.fsis.usda.gov/fsis-content/rss/recalls.xml"

test_url "TTB News RSS" \
  "https://www.ttb.gov/rss/news-and-events.xml"

echo "================================================"
echo "PART 2: GOVERNMENT APIs"
echo "================================================"
echo ""

test_url "FDA OpenFDA Food Enforcement" \
  "https://api.fda.gov/food/enforcement.json?limit=1"

test_url "EPA ECHO Facilities" \
  "https://echo.epa.gov/tools/web-services/get_facilities.json?output=JSON&responseset=1&p_act=Y"

test_url "Federal Register API" \
  "https://www.federalregister.gov/api/v1/documents.json?per_page=1"

test_url "Health Canada Recalls API" \
  "https://healthycanadians.gc.ca/recall-alert-rappel-avis/api/recent.json?lang=en&cat=all"

test_url "USDA AMS Organic Integrity API" \
  "https://organic.ams.usda.gov/integrity/api/operations?limit=1"

echo "================================================"
echo "PART 3: WEB PAGES (Scraping Targets)"
echo "================================================"
echo ""

test_url "FDA Warning Letters Page" \
  "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters"

test_url "FDA Import Alerts Page" \
  "https://www.accessdata.fda.gov/cms_ia/default.html"

test_url "NOAA Fisheries Page" \
  "https://www.fisheries.noaa.gov/national/seafood-commerce-certification/seafood-import-monitoring-program"

test_url "CBP Trade News" \
  "https://www.cbp.gov/newsroom/trade"

test_url "USDA APHIS News" \
  "https://www.aphis.usda.gov/aphis/newsroom/news"

echo "================================================"
echo "SPECIAL: Regulations.gov (Requires API Key)"
echo "================================================"
echo ""

# Test Regulations.gov - will fail without API key but confirms endpoint
http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 \
  "https://api.regulations.gov/v4/documents?page[size]=1" \
  -H "User-Agent: RegIQ-Test/1.0" \
  -H "Accept: application/vnd.api+json" 2>&1)

test_count=$((test_count + 1))
echo -e "${YELLOW}Test ${test_count}:${NC} Regulations.gov API"
echo "  URL: https://api.regulations.gov/v4/documents"

if [ "$http_code" = "403" ] || [ "$http_code" = "401" ]; then
  echo -e "  ${GREEN}✓ PASS${NC} (HTTP $http_code - API key required but endpoint exists)"
  pass_count=$((pass_count + 1))
elif [ "$http_code" = "200" ]; then
  echo -e "  ${GREEN}✓ PASS${NC} (HTTP $http_code - Accessible)"
  pass_count=$((pass_count + 1))
else
  echo -e "  ${RED}✗ FAIL${NC} (HTTP $http_code)"
  fail_count=$((fail_count + 1))
fi
echo ""

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
  echo -e "${GREEN}✓ All sources are accessible!${NC}"
  exit 0
elif [ $success_rate -ge 80 ]; then
  echo -e "${YELLOW}⚠ Most sources accessible (${success_rate}%). Review failures above.${NC}"
  exit 0
else
  echo -e "${RED}✗ Many sources failed. Check network connectivity.${NC}"
  exit 1
fi