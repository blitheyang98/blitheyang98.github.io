#!/bin/bash

echo "=== Viewing PostgreSQL Data ==="
echo ""

echo "Method 1: Using psql in Docker container"
echo "Run: docker-compose exec postgres psql -U postgres -d recruitment_db"
echo ""

echo "Method 2: Using Node.js script"
echo "Run: node server/scripts/view-data.js"
echo ""

echo "Quick queries:"
echo "1. View all tables:"
echo "   docker-compose exec postgres psql -U postgres -d recruitment_db -c '\dt'"
echo ""
echo "2. View users:"
echo "   docker-compose exec postgres psql -U postgres -d recruitment_db -c 'SELECT * FROM users;'"
echo ""
echo "3. View quizzes:"
echo "   docker-compose exec postgres psql -U postgres -d recruitment_db -c 'SELECT id, title, created_at FROM quizzes;'"
echo ""
echo "4. View quiz attempts:"
echo "   docker-compose exec postgres psql -U postgres -d recruitment_db -c 'SELECT * FROM quiz_attempts;'"
echo ""

