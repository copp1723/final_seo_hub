# GitHub Branch Protection Setup Guide

This guide provides step-by-step instructions for setting up branch protection rules on the main branch of your SEO Hub repository.

## Prerequisites

1. **Repository Admin Access**: You must have admin access to the repository
2. **GitHub Actions Workflows**: The CI workflows must be committed to the repository first
3. **Initial Commit**: At least one commit must exist on the main branch

## Step 1: Commit the CI Workflows

First, commit the GitHub Actions workflows that were just created:

```bash
# Add the new GitHub Actions files
git add .github/

# Commit the workflows
git commit -m "Add GitHub Actions CI/CD workflows and PR template

- Add comprehensive CI workflow with testing, linting, and building
- Add security audit workflow with dependency scanning
- Add pull request template for consistent PR format
- Configure PostgreSQL service for integration tests"

# Push to main branch
git push origin main
```

## Step 2: Access Branch Protection Settings

1. Go to your repository on GitHub
2. Click on **Settings** tab
3. In the left sidebar, click **Branches**
4. Click **Add rule** or **Add branch protection rule**

## Step 3: Configure Branch Protection Rule

### Basic Settings

1. **Branch name pattern**: Enter `main`
2. **Restrict pushes that create matching branches**: ✅ Check this

### Pull Request Requirements

✅ **Require a pull request before merging**
- ✅ **Require approvals**: Set to `1` (or more based on team size)
- ✅ **Dismiss stale pull request approvals when new commits are pushed**
- ✅ **Require review from code owners** (if you have a CODEOWNERS file)

### Status Check Requirements

✅ **Require status checks to pass before merging**
- ✅ **Require branches to be up to date before merging**

**Required status checks** (Add these exact names):
- `Test & Lint`
- `Build`
- `Security Audit`

### Additional Restrictions

✅ **Restrict pushes that create matching branches**
✅ **Do not allow bypassing the above settings**
- ✅ **Restrict pushes that create matching branches**

### Advanced Settings (Recommended)

- ✅ **Require linear history** (prevents merge commits, enforces rebase/squash)
- ✅ **Require deployments to succeed before merging** (if you have deployment checks)
- ✅ **Lock branch** (prevents any pushes to main, including admins)

## Step 4: Verify Configuration

After saving the branch protection rule, verify it's working:

1. Try to push directly to main - it should be blocked
2. Create a test branch and PR to ensure CI runs
3. Verify that PR cannot be merged until checks pass

## Step 5: Test the Protection

Create a test branch to verify everything works:

```bash
# Create and switch to test branch
git checkout -b test-branch-protection

# Make a small change
echo "# Test Branch Protection" >> TEST.md
git add TEST.md
git commit -m "Test: Add test file to verify branch protection"

# Push the test branch
git push origin test-branch-protection
```

Then:
1. Create a PR from `test-branch-protection` to `main`
2. Verify that CI workflows run automatically
3. Verify that the PR cannot be merged until all checks pass
4. Merge the PR once checks pass
5. Delete the test branch

## Expected Behavior After Setup

### ✅ What Should Work
- Creating branches from main
- Creating pull requests to main
- CI workflows running on every PR
- Merging PRs after all checks pass and approval

### ❌ What Should Be Blocked
- Direct pushes to main branch
- Force pushes to main branch
- Merging PRs without required approvals
- Merging PRs with failing CI checks
- Bypassing required status checks

## Troubleshooting

### Status Checks Not Appearing
- Ensure the workflow names in the YAML files match exactly what you entered in branch protection
- The workflows must run at least once before they appear as available status checks
- Check that the workflows are in the `.github/workflows/` directory

### Workflows Failing
- Check the Actions tab in your repository for error details
- Ensure all required environment variables are set (though CI uses test values)
- Verify that the PostgreSQL service is starting correctly in the test job

### Cannot Create Branch Protection Rule
- Verify you have admin access to the repository
- Ensure there's at least one commit on the main branch
- Check that the branch name pattern is exactly `main`

## Status Check Names Reference

When adding required status checks in GitHub, use these exact names:

```
Test & Lint
Build
Security Audit
```

These names must match the `name:` field in your workflow files:
- `Test & Lint` from `.github/workflows/ci.yml`
- `Build` from `.github/workflows/ci.yml`
- `Security Audit` from `.github/workflows/security.yml`

## Additional Security Measures

### Code Owners (Optional)
Create a `.github/CODEOWNERS` file to require specific people to review certain files:

```
# Global owners
* @your-username

# Require security team review for sensitive files
/lib/auth.ts @security-team
/lib/encryption.ts @security-team
/.github/workflows/ @devops-team
```

### Signed Commits (Optional)
Consider requiring signed commits for additional security:
- ✅ **Require signed commits** in branch protection settings

## Maintenance

### Regular Tasks
- Review and update required status checks when adding new workflows
- Update branch protection rules when changing CI/CD pipeline
- Monitor failed status checks and address issues promptly
- Review branch protection settings quarterly

### When Adding New Workflows
1. Add the workflow file to `.github/workflows/`
2. Test the workflow on a feature branch
3. Update branch protection rules to include new required checks
4. Document any new requirements for contributors

## Summary

After completing this setup, your main branch will be protected with:

1. **Required Pull Requests**: No direct pushes to main
2. **Required Status Checks**: CI must pass (tests, lint, build, security)
3. **Required Reviews**: At least one approval needed
4. **Up-to-date Branches**: Branches must be current before merging
5. **No Force Pushes**: Prevents history rewriting on main

This ensures code quality, security, and proper review processes for all changes to your production codebase. 