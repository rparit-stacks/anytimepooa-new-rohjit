#!/bin/bash

# Vercel Live Logs Tracker
# This script streams live logs from your Vercel deployment

echo "🔍 Starting Vercel Logs Tracker..."
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found!"
    echo "Installing Vercel CLI..."
    npm install -g vercel
    echo "✅ Vercel CLI installed!"
    echo ""
fi

# Check if logged in to Vercel
echo "Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    echo "❌ Not logged in to Vercel!"
    echo "Please run: vercel login"
    echo "Or run: vercel login --github"
    exit 1
fi

echo "✅ Logged in to Vercel"
echo ""

# Get project name
PROJECT_NAME="anytimepooa-new-rohjit"
echo "📦 Project: $PROJECT_NAME"
echo ""

# Filter for important logs
echo "🔴 Filtering for:"
echo "  - [Middleware]"
echo "  - [getCurrentUser]"
echo "  - [v0]"
echo "  - [Dashboard]"
echo "  - Cookie"
echo "  - Session"
echo ""

echo "📡 Streaming live logs (Press Ctrl+C to stop)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Stream logs with color coding
vercel logs --follow $PROJECT_NAME 2>&1 | while IFS= read -r line; do
    if [[ $line =~ \[Middleware\] ]]; then
        echo -e "\033[0;36m$line\033[0m"  # Cyan
    elif [[ $line =~ \[getCurrentUser\] ]]; then
        echo -e "\033[0;33m$line\033[0m"  # Yellow
    elif [[ $line =~ \[v0\] ]]; then
        echo -e "\033[0;35m$line\033[0m"  # Magenta
    elif [[ $line =~ \[Dashboard\] ]]; then
        echo -e "\033[0;32m$line\033[0m"  # Green
    elif [[ $line =~ (Cookie|Session|cookie|session) ]]; then
        echo -e "\033[0;37m\033[44m$line\033[0m"  # White on Blue
    elif [[ $line =~ (Error|error|ERROR|Failed|failed) ]]; then
        echo -e "\033[0;31m$line\033[0m"  # Red
    elif [[ $line =~ (Success|success|SUCCESS|Logged in) ]]; then
        echo -e "\033[0;32m$line\033[0m"  # Green
    else
        echo "$line"
    fi
done

