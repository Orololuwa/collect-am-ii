#!/bin/bash

# Quick script to test Docker build locally
# Usage: ./test-docker.sh

set -e

echo "🐳 Testing Docker build locally..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
  echo "⚠️  Warning: .env file not found"
  echo "   Make sure you have a .env file with required variables:"
  echo "   - DATABASE_URL"
  echo "   - COOKIE_SECRET"
  echo "   - API_KEY_ENCRYPTION_KEY"
  echo ""
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker and try again."
  exit 1
fi

echo "✅ Docker is running"
echo ""

# Build and run
echo "📦 Building Docker image..."
docker-compose build

echo ""
echo "🚀 Starting container..."
echo "   The app will be available at http://localhost:3001"
echo "   Press Ctrl+C to stop"
echo ""

docker-compose up
