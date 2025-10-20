#!/bin/bash

###############################################################################
# Deployment Helper Script for AWS EC2
# 
# This script helps automate common deployment tasks
# Make it executable: chmod +x deploy.sh
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Banner
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════╗"
echo "║   Application Deployment Helper       ║"
echo "╚═══════════════════════════════════════╝"
echo -e "${NC}"

# Check if .env exists
check_env() {
    print_info "Checking environment configuration..."
    if [ ! -f .env ]; then
        print_error ".env file not found!"
        print_warning "Copy .env.example to .env and configure it:"
        echo "  cp .env.example .env"
        echo "  nano .env"
        exit 1
    fi
    print_success ".env file exists"
}

# Install dependencies
install_deps() {
    print_info "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
}

# Build application
build_app() {
    print_info "Building application..."
    npm run build
    print_success "Application built successfully"
}

# Start with PM2
start_pm2() {
    print_info "Starting application with PM2..."
    
    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        print_error "PM2 is not installed!"
        print_info "Install it with: sudo npm install -g pm2"
        exit 1
    fi
    
    # Check if ecosystem.config.js exists
    if [ -f ecosystem.config.js ]; then
        pm2 start ecosystem.config.js --env production
    else
        pm2 start npm --name "my-app" -- start
    fi
    
    pm2 save
    print_success "Application started with PM2"
}

# Setup PM2 startup
setup_pm2_startup() {
    print_info "Setting up PM2 to start on boot..."
    pm2 startup ubuntu
    print_warning "Run the command shown above to complete startup configuration"
}

# Generate secret keys
generate_keys() {
    print_info "Generating secure random keys..."
    echo ""
    echo "SESSION_SECRET:"
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    echo ""
    echo "ENCRYPTION_KEY:"
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    echo ""
    print_success "Copy these keys to your .env file"
}

# Check system requirements
check_system() {
    print_info "Checking system requirements..."
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        print_success "Node.js installed: $NODE_VERSION"
    else
        print_error "Node.js not found! Install it first."
        exit 1
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm -v)
        print_success "npm installed: $NPM_VERSION"
    else
        print_error "npm not found!"
        exit 1
    fi
    
    # Check PostgreSQL
    if command -v psql &> /dev/null; then
        PSQL_VERSION=$(psql --version)
        print_success "PostgreSQL installed: $PSQL_VERSION"
    else
        print_warning "PostgreSQL not found (may be using remote database)"
    fi
    
    # Check Nginx
    if command -v nginx &> /dev/null; then
        NGINX_VERSION=$(nginx -v 2>&1)
        print_success "Nginx installed: $NGINX_VERSION"
    else
        print_warning "Nginx not found (install if using as reverse proxy)"
    fi
}

# Database push
db_push() {
    print_info "Pushing database schema..."
    npm run db:push
    print_success "Database schema updated"
}

# Show PM2 logs
show_logs() {
    print_info "Showing PM2 logs (Ctrl+C to exit)..."
    pm2 logs my-app
}

# Full deployment
full_deploy() {
    print_info "Starting full deployment..."
    check_env
    install_deps
    build_app
    
    # Ask about database migration
    read -p "Push database schema? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        db_push
    fi
    
    # Check if PM2 is running the app
    if pm2 list | grep -q "my-app"; then
        print_info "Restarting application..."
        pm2 restart my-app
    else
        start_pm2
    fi
    
    print_success "Deployment completed!"
    print_info "Check status with: pm2 status"
    print_info "View logs with: pm2 logs my-app"
}

# Update deployment (for code updates)
update_deploy() {
    print_info "Updating application..."
    
    # Pull latest code
    if [ -d .git ]; then
        print_info "Pulling latest changes..."
        git pull origin main || git pull origin master
    fi
    
    install_deps
    build_app
    
    print_info "Restarting application..."
    pm2 restart my-app
    
    print_success "Update completed!"
}

# Menu
show_menu() {
    echo ""
    echo "Choose an option:"
    echo "  1) Full deployment (first time)"
    echo "  2) Update deployment (after code changes)"
    echo "  3) Build application only"
    echo "  4) Start with PM2"
    echo "  5) Restart PM2 app"
    echo "  6) View PM2 logs"
    echo "  7) Push database schema"
    echo "  8) Generate secret keys"
    echo "  9) Check system requirements"
    echo "  10) Setup PM2 startup"
    echo "  0) Exit"
    echo ""
    read -p "Enter option: " option
    
    case $option in
        1)
            full_deploy
            ;;
        2)
            update_deploy
            ;;
        3)
            build_app
            ;;
        4)
            start_pm2
            ;;
        5)
            pm2 restart my-app
            print_success "Application restarted"
            ;;
        6)
            show_logs
            ;;
        7)
            db_push
            ;;
        8)
            generate_keys
            ;;
        9)
            check_system
            ;;
        10)
            setup_pm2_startup
            ;;
        0)
            print_info "Goodbye!"
            exit 0
            ;;
        *)
            print_error "Invalid option"
            ;;
    esac
}

# Check if script is run with arguments
if [ $# -eq 0 ]; then
    # No arguments, show menu
    while true; do
        show_menu
    done
else
    # Run specific command
    case $1 in
        deploy)
            full_deploy
            ;;
        update)
            update_deploy
            ;;
        build)
            build_app
            ;;
        keys)
            generate_keys
            ;;
        check)
            check_system
            ;;
        logs)
            show_logs
            ;;
        *)
            echo "Usage: $0 [deploy|update|build|keys|check|logs]"
            echo "  or run without arguments for interactive menu"
            exit 1
            ;;
    esac
fi
