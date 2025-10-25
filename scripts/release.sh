#!/bin/bash

# Automated release script for OpenSheetMusicDisplay
# Usage: ./scripts/release.sh [patch|minor|major]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
print_status "Current version: $CURRENT_VERSION"

# Determine version bump type
BUMP_TYPE=${1:-patch}
if [[ ! "$BUMP_TYPE" =~ ^(patch|minor|major)$ ]]; then
    print_error "Invalid bump type. Use: patch, minor, or major"
    exit 1
fi

print_status "Bumping $BUMP_TYPE version..."

# Bump version
npm version $BUMP_TYPE --no-git-tag-version
NEW_VERSION=$(node -p "require('./package.json').version")

print_success "Version bumped to: $NEW_VERSION"

# Build the package
print_status "Building package..."
npm run build

# Check if build was successful
if [ ! -f "releases/opensheetmusicdisplay-$NEW_VERSION.tgz" ]; then
    print_error "Build failed - package file not found"
    exit 1
fi

print_success "Package built successfully"

# Commit changes
print_status "Committing changes..."
git add package.json releases/opensheetmusicdisplay-$NEW_VERSION.tgz
git commit -m "Release v$NEW_VERSION"

# Create and push tag
print_status "Creating tag v$NEW_VERSION..."
git tag v$NEW_VERSION
git push origin master-tree
git push origin v$NEW_VERSION

print_success "Tag v$NEW_VERSION created and pushed"

# Create GitHub release
print_status "Creating GitHub release..."

# Check if GitHub CLI is available
if command -v gh &> /dev/null; then
    gh release create v$NEW_VERSION \
        releases/opensheetmusicdisplay-$NEW_VERSION.tgz \
        --title "OpenSheetMusicDisplay v$NEW_VERSION" \
        --notes "Built package with TypeScript definitions for easy installation via pnpm/npm

## Installation
\`\`\`bash
pnpm add https://github.com/guiles00/opensheetmusicdisplay/releases/download/v$NEW_VERSION/opensheetmusicdisplay-$NEW_VERSION.tgz
\`\`\`

## Changes
- Built from source with latest changes
- Includes complete TypeScript definitions
"
    
    print_success "GitHub release created successfully"
else
    print_warning "GitHub CLI not found. Please create the release manually:"
    print_warning "1. Go to: https://github.com/guiles00/opensheetmusicdisplay/releases"
    print_warning "2. Click 'Create a new release'"
    print_warning "3. Select tag: v$NEW_VERSION"
    print_warning "4. Upload file: releases/opensheetmusicdisplay-$NEW_VERSION.tgz"
fi

# Print installation command
print_success "Release v$NEW_VERSION is ready!"
echo ""
print_status "Install in your other projects with:"
echo -e "${GREEN}pnpm add https://github.com/guiles00/opensheetmusicdisplay/releases/download/v$NEW_VERSION/opensheetmusicdisplay-$NEW_VERSION.tgz${NC}"
echo ""
print_status "Or update your package.json:"
echo -e "${GREEN}\"opensheetmusicdisplay\": \"https://github.com/guiles00/opensheetmusicdisplay/releases/download/v$NEW_VERSION/opensheetmusicdisplay-$NEW_VERSION.tgz\"${NC}"
