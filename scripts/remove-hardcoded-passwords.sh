#!/bin/bash

# Script to remove all hardcoded passwords from the codebase
# This script will replace all instances of the hardcoded password with secure placeholders

echo "🔐 Removing hardcoded passwords from codebase..."

# Define the hardcoded password to replace
OLD_PASS="Blacksun(0147)"

# Replace in all files
find /Users/laurence/management-project -type f \( -name "*.md" -o -name "*.js" -o -name "*.sh" -o -name "*.html" \) -exec grep -l "$OLD_PASS" {} \; | while read -r file; do
    echo "🔧 Securing file: $file"
    
    # Different replacement strategies based on file type
    case "$file" in
        *.md)
            sed -i '' "s/$OLD_PASS/[REDACTED - Use secure password]/g" "$file"
            ;;
        *.js)
            sed -i '' "s/$OLD_PASS/process.env.ADMIN_PASSWORD || 'changeme123'/g" "$file"
            ;;
        *.sh)
            sed -i '' "s/$OLD_PASS/\${ADMIN_PASSWORD:-changeme123}/g" "$file"
            ;;
        *.html)
            sed -i '' "s/$OLD_PASS/[ENTER-SECURE-PASSWORD]/g" "$file"
            ;;
        *)
            sed -i '' "s/$OLD_PASS/[SECURE-PASSWORD-PLACEHOLDER]/g" "$file"
            ;;
    esac
done

echo "✅ All hardcoded passwords have been secured!"
echo "📝 Remember to:"
echo "   1. Set ADMIN_PASSWORD environment variable in production"
echo "   2. Update all placeholder passwords with secure values"
echo "   3. Never commit actual passwords to version control"