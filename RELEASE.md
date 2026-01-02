# Release Process

This project includes an automated release system that handles version bumping, building, tagging, and GitHub release creation.

## Quick Release Commands

### Patch Release (Bug fixes)
```bash
npm run release:patch
# or
./scripts/release.sh patch
```

### Minor Release (New features)
```bash
npm run release:minor
# or
./scripts/release.sh minor
```

### Major Release (Breaking changes)
```bash
npm run release:major
# or
./scripts/release.sh major
```

## What the Release Script Does

1. **Bumps version** in `package.json` (patch/minor/major)
2. **Builds the package** using `npm run build`
3. **Commits changes** with a release message
4. **Creates and pushes** a git tag (e.g., `v1.9.4`)
5. **Creates GitHub release** with the `.tgz` file attached
6. **Prints installation command** for other projects

## Installation in Other Projects

After a release, install in your other projects with:

```bash
pnpm add https://github.com/guiles00/opensheetmusicdisplay/releases/download/v1.9.4/opensheetmusicdisplay-1.9.4.tgz
```

Or update your `package.json`:

```json
{
  "dependencies": {
    "opensheetmusicdisplay": "https://github.com/guiles00/opensheetmusicdisplay/releases/download/v1.9.4/opensheetmusicdisplay-1.9.4.tgz"
  }
}
```

## Requirements

- **GitHub CLI** (optional but recommended): `brew install gh` or `npm install -g @github/cli`
- **Git** configured with remote origin
- **Node.js** and **npm**

## Manual Release (if GitHub CLI not available)

If GitHub CLI is not installed, the script will prompt you to create the release manually:

1. Go to: https://github.com/guiles00/opensheetmusicdisplay/releases
2. Click "Create a new release"
3. Select the tag (e.g., `v1.9.4`)
4. Upload the `.tgz` file from `releases/` directory
5. Publish the release
