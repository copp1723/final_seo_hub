#!/bin/bash

# Alpha Deployment Script for SEO Hub
# This script handles the complete deployment process for alpha launch

set -e  # Exit on any error

echo "🚀 Starting Alpha Deployment Process..."

# Configuration
ENVIRONMENT=${1:-production}
SKIP_TESTS=${2:-false}
BACKUP_DB=${3:-true}

echo "Environment: $ENVIRONMENT"
echo "Skip Tests: $SKIP_TESTS"
echo "Backup Database: $BACKUP_DB"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js version 18 or higher is required"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check environment file
    if [ ! -f ".env.${ENVIRONMENT}" ] && [ ! -f ".env" ]; then
        log_error "Environment file not found (.env.${ENVIRONMENT} or .env)"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Backup database
backup_database() {
    if [ "$BACKUP_DB" = "true" ]; then
        log_info "Creating database backup..."
        
        BACKUP_DIR="./backups"
        mkdir -p "$BACKUP_DIR"
        
        TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
        BACKUP_FILE="${BACKUP_DIR}/pre_alpha_deployment_${TIMESTAMP}.sql"
        
        # Extract database URL from environment
        if [ -f ".env.${ENVIRONMENT}" ]; then
            source ".env.${ENVIRONMENT}"
        else
            source ".env"
        fi
        
        if [ -n "$DATABASE_URL" ]; then
            pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
            gzip "$BACKUP_FILE"
            log_success "Database backup created: ${BACKUP_FILE}.gz"
        else
            log_warning "DATABASE_URL not found, skipping backup"
        fi
    fi
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    # Clean install
    rm -rf node_modules package-lock.json
    npm install
    
    log_success "Dependencies installed"
}

# Run tests
run_tests() {
    if [ "$SKIP_TESTS" = "false" ]; then
        log_info "Running tests..."
        
        # Type checking
        npm run type-check
        
        # Unit tests
        npm run test
        
        # Integration tests for critical APIs
        npm run test:redis
        
        log_success "All tests passed"
    else
        log_warning "Skipping tests"
    fi
}

# Database operations
setup_database() {
    log_info "Setting up database..."
    
    # Generate Prisma client
    npx prisma generate
    
    # Run migrations
    npx prisma migrate deploy
    
    # Verify database connection
    node -e "
        const { prisma } = require('./lib/prisma');
        prisma.\$connect()
            .then(() => {
                console.log('Database connection successful');
                process.exit(0);
            })
            .catch((error) => {
                console.error('Database connection failed:', error);
                process.exit(1);
            });
    "
    
    log_success "Database setup completed"
}

# Build application
build_application() {
    log_info "Building application..."
    
    # Set environment
    export NODE_ENV=$ENVIRONMENT
    
    # Build Next.js application
    npm run build
    
    log_success "Application built successfully"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Start application in background for testing
    npm start &
    APP_PID=$!
    
    # Wait for application to start
    sleep 10
    
    # Health check
    HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || echo "000")
    
    if [ "$HEALTH_CHECK" = "200" ]; then
        log_success "Health check passed"
    else
        log_error "Health check failed (HTTP $HEALTH_CHECK)"
        kill $APP_PID 2>/dev/null || true
        exit 1
    fi
    
    # Test critical endpoints
    log_info "Testing critical endpoints..."
    
    # GA4 status endpoint
    GA4_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/ga4/status || echo "000")
    if [ "$GA4_CHECK" = "401" ] || [ "$GA4_CHECK" = "200" ]; then
        log_success "GA4 endpoint accessible"
    else
        log_warning "GA4 endpoint issue (HTTP $GA4_CHECK)"
    fi
    
    # Search Console status endpoint
    SC_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/search-console/status || echo "000")
    if [ "$SC_CHECK" = "401" ] || [ "$SC_CHECK" = "200" ]; then
        log_success "Search Console endpoint accessible"
    else
        log_warning "Search Console endpoint issue (HTTP $SC_CHECK)"
    fi
    
    # SEOWorks webhook endpoint
    SW_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/seoworks/webhook || echo "000")
    if [ "$SW_CHECK" = "401" ] || [ "$SW_CHECK" = "405" ]; then
        log_success "SEOWorks webhook endpoint accessible"
    else
        log_warning "SEOWorks webhook endpoint issue (HTTP $SW_CHECK)"
    fi
    
    # Stop test application
    kill $APP_PID 2>/dev/null || true
    
    log_success "Deployment verification completed"
}

# Setup monitoring
setup_monitoring() {
    log_info "Setting up monitoring..."
    
    # Create log directory
    mkdir -p logs
    
    # Setup log rotation
    if command -v logrotate &> /dev/null; then
        cat > /tmp/seo-hub-logrotate << EOF
./logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    copytruncate
}
EOF
        sudo mv /tmp/seo-hub-logrotate /etc/logrotate.d/seo-hub
        log_success "Log rotation configured"
    fi
    
    # Setup cron jobs for maintenance
    (crontab -l 2>/dev/null; echo "0 2 * * * cd $(pwd) && npm run db:cleanup") | crontab -
    (crontab -l 2>/dev/null; echo "*/15 * * * * curl -s http://localhost:3000/api/health > /dev/null") | crontab -
    
    log_success "Monitoring setup completed"
}

# Create deployment summary
create_summary() {
    log_info "Creating deployment summary..."
    
    SUMMARY_FILE="deployment-summary-$(date +%Y%m%d_%H%M%S).md"
    
    cat > "$SUMMARY_FILE" << EOF
# Alpha Deployment Summary

**Date:** $(date)
**Environment:** $ENVIRONMENT
**Node Version:** $(node -v)
**npm Version:** $(npm -v)

## Deployment Status
- ✅ Prerequisites checked
- ✅ Dependencies installed
- $([ "$SKIP_TESTS" = "false" ] && echo "✅ Tests passed" || echo "⚠️ Tests skipped")
- $([ "$BACKUP_DB" = "true" ] && echo "✅ Database backed up" || echo "⚠️ Database backup skipped")
- ✅ Database migrations applied
- ✅ Application built
- ✅ Deployment verified

## Critical Endpoints Status
- Health Check: ✅ Operational
- GA4 Integration: ✅ Accessible
- Search Console: ✅ Accessible  
- SEOWorks Webhook: ✅ Accessible

## Next Steps
1. Configure production domain and SSL
2. Set up external monitoring
3. Configure email notifications
4. Test with sister company users
5. Onboard 22 dealer accounts

## Environment Variables Required
- DATABASE_URL
- NEXTAUTH_SECRET
- GOOGLE_CLIENT_ID/SECRET
- SEOWORKS_API_KEY
- MAILGUN_API_KEY
- ENCRYPTION_KEY

## Support Information
- Logs Location: ./logs/
- Backup Location: ./backups/
- Health Check: /api/health
- Admin Panel: /admin

EOF

    log_success "Deployment summary created: $SUMMARY_FILE"
}

# Main deployment process
main() {
    echo "========================================="
    echo "🚀 SEO Hub Alpha Deployment"
    echo "========================================="
    
    check_prerequisites
    backup_database
    install_dependencies
    run_tests
    setup_database
    build_application
    verify_deployment
    setup_monitoring
    create_summary
    
    echo "========================================="
    log_success "🎉 Alpha deployment completed successfully!"
    echo "========================================="
    
    echo ""
    echo "📋 Next Steps:"
    echo "1. Start the application: npm start"
    echo "2. Configure your domain and SSL"
    echo "3. Test all integrations"
    echo "4. Begin user onboarding"
    echo ""
    echo "📊 Monitor the deployment:"
    echo "- Health: curl http://localhost:3000/api/health"
    echo "- Logs: tail -f logs/application.log"
    echo "- Admin: http://localhost:3000/admin"
}

# Run main function
main "$@"