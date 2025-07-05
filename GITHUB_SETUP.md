# GitHub Private Repository Downloads Setup

This guide explains how to configure your application to serve downloads from a private GitHub repository.

## Prerequisites

1. Your application releases are stored in a GitHub repository (can be private)
2. You have admin access to the GitHub repository
3. Your releases are published with consistent file naming

## Step 1: Create a GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a descriptive name like "QuackQuery Downloads"
4. Set expiration (recommended: 1 year)
5. Select the following scopes:
   - `repo` (Full control of private repositories)
   - `public_repo` (Access public repositories) - if your repo might become public

6. Click "Generate token"
7. **Copy the token immediately** - you won't be able to see it again

## Step 2: Configure Environment Variables

Add these environment variables to your deployment:

### Frontend (.env.local)
```bash
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-repository-name  
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Backend (.env)
```bash
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-repository-name
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Step 3: Update Asset Names

In both files, update the asset names to match your actual release files:

- `youtube-clipper/frontend/app/api/download/github/route.ts`
- `youtube-clipper/backend/src/quackquery-server.ts`

Look for this section:
```typescript
// Windows executable name - UPDATE THIS TO MATCH YOUR RELEASE FILE
const assetName = 'QuackQuerySetup.exe';    // ← Update this to match your release file
```

## Step 4: Release File Structure

Your GitHub releases should have a Windows executable file. For example:
- `QuackQuerySetup.exe` (Windows)

## Alternative Options

### Option A: Make Releases Public (Easiest)
Even with a private repository, you can make individual releases public:
1. Go to your repository releases
2. Edit the release
3. Uncheck "This is a pre-release" if needed
4. The release assets become publicly downloadable

### Option B: Use GitHub Apps (More Secure)
For production, consider creating a GitHub App instead of using personal access tokens:
1. More granular permissions
2. Better security
3. Can be revoked independently

### Option C: Host Files Elsewhere
You can also host your release files on:
- AWS S3 with CloudFront
- Azure Blob Storage
- Google Cloud Storage
- Your own CDN

## Troubleshooting

### Common Issues:

1. **"GitHub access not configured"**
   - Check if `GITHUB_TOKEN` environment variable is set
   - Verify the token has correct permissions

2. **"Windows executable not found"**
   - Check if your release has the expected Windows .exe file
   - Verify the asset name in the code matches your actual file

3. **403 Forbidden**
   - Token might be expired or have insufficient permissions
   - Check if the repository name and owner are correct

4. **Asset not found**
   - Make sure your release has files uploaded
   - Check that the file names match exactly (case-sensitive)

## Testing

To test the setup:
1. Create a test release in your repository
2. Upload test files with the expected names
3. Access the download endpoint as a sudo user
4. Check the browser network tab for any errors

## Security Notes

- Store the GitHub token securely
- Use environment variables, never commit tokens to code
- Consider token rotation policies
- Monitor token usage in GitHub settings 