#!/bin/bash

# First, let's check what's happening
echo "🔍 Checking for running processes..."
ps aux | grep -E "(node|next)" | grep -v grep

echo ""
echo "📊 System resources:"
df -h . | grep -v Filesystem
echo ""
echo "Memory usage:"
top -l 1 | head -n 10

echo ""
echo "🛑 Press Ctrl+C in your terminal to stop the stalled build"
echo ""
echo "Then run:"
echo "chmod +x fix-and-build.sh"
echo "./fix-and-build.sh"
