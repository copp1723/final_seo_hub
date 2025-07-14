# Running Dealership Setup on Render

## Current Issue
You're in `/opt/render/project/src/` but the scripts are in `/opt/render/project/`

## Solution
Navigate to the correct directory first:

```bash
# Go up one level to the project root
cd ..

# Verify you're in the right place
pwd
# Should show: /opt/render/project

# List files to confirm scripts directory exists
ls -la scripts/

# Now run the script
node scripts/setup-all-dealerships.js
```

## Alternative: Run from Current Directory
If you want to stay in the src directory, use the relative path:

```bash
# From /opt/render/project/src/
node ../scripts/setup-all-dealerships.js
```

## Full Command Sequence for Render:
```bash
cd /opt/render/project
node scripts/setup-all-dealerships.js
```

This will create all 22 dealerships and fix your dropdown issue!