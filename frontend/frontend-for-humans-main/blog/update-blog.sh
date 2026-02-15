#!/bin/bash
set -e

# Script to rebuild the blog and deploy it to the parent website
# Usage: ./update-blog.sh

echo "Building blog with /blog/ base path..."
scratch build --base /blog/

echo "Removing old blog assets from parent website..."
rm -rf ../public/blog

echo "Copying new blog build to parent website..."
cp -r dist ../public/blog

echo "✓ Blog updated successfully!"
echo "The blog has been built and copied to ../public/blog/"
