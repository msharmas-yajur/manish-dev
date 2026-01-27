#!/bin/bash
# Calculate total lines of code excluding dependencies and artifacts
TOTAL=$(find . -type f \
  \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.html" -o -name "*.css" -o -name "*.sql" -o -name "*.sh" -o -name "*.yaml" -o -name "*.yml" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/dist/*" \
  -not -path "*/.next/*" \
  -not -path "*/.turbo/*" \
  -not -path "*/.git/*" \
  -not -path "*/__pycache__/*" \
  -not -path "*/docs/*" \
  -not -name "pnpm-lock.yaml" \
  -not -name "package-lock.json" \
  -exec wc -l {} + | tail -n 1 | awk '{print $1}')

DATE=$(date +"%Y-%m-%d %H:%M:%S")

# Create METRICS.md if it doesn't exist
if [ ! -f METRICS.md ]; then
    echo "# Code Metrics Tracking" > METRICS.md
    echo "This file is automatically updated by a GitHub Action to track the total lines of code in the repository." >> METRICS.md
    echo "" >> METRICS.md
    echo "| Date | Total Lines of Code |" >> METRICS.md
    echo "| :--- | :--- |" >> METRICS.md
fi

# Append the new entry
echo "| $DATE | $TOTAL |" >> METRICS.md
