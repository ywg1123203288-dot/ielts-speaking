#!/bin/bash
set -Eeuo pipefail

echo "Building the Next.js project..."
pnpm next build

echo "Build completed successfully!"
