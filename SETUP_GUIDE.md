# MetaHealth Police - Project Setup Guide

## 🚀 Quick Setup for New Users

This guide will help you set up the MetaHealth Police project from scratch, including automatic database initialization.

### 📋 Prerequisites

1. **Node.js** (version 16 or higher)
2. **PostgreSQL** (version 12 or higher)
3. **Git**

### 🔧 Setup Steps

#### 1. Clone the Repository
```bash
git clone <repository-url>
cd metahealth-police
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Database Setup

**Option A: Create Database Manually**
```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create database
CREATE DATABASE metahealth_police;

-- Create user (optional)
CREATE USER metahealth_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE metahealth_police TO metahealth_user;
```

**Option B: Use existing PostgreSQL instance**
- Make sure you have a PostgreSQL database ready
- Note down the connection details

#### 4. Environment Configuration

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3100
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=metahealth_police
DB_USER=postgres
DB_PASSWORD=your_password_here
DATABASE_URL=postgresql://postgres:your_password_here@localhost:5432/metahealth_police

# Add other environment variables as needed
JWT_SECRET=your_jwt_secret_here
```

**Important:** Replace `your_password_here` with your actual PostgreSQL password.

#### 5. Start the Application

```bash
npm run dev
```

### ✅ Automatic Database Initialization

The application will automatically:

1. **Test database connection**
2. **Create all required tables** if they don't exist
3. **Set up indexes and constraints**
4. **Create default super admin user**

You'll see output like this:
```
🚀 MetaHealth Police server is running!
📍 Environment: development
🌐 Server: http://localhost:3100

🔌 Testing database connection...
✅ Database connection successful

🏗️  Initializing database schema...
🔧 Initializing database schema...
✅ UUID extension created
✅ Update trigger function created
✅ Hospitals table created
✅ Users table created
✅ Auth tables created
✅ Patients table created
✅ Appointments table created
✅ Appointment documents table created
✅ Database initialization completed successfully!

👑 Initializing default super admin...
✅ Super admin user created successfully
```

### 🔍 Verify Setup

#### Check Database Status
Visit: `http://localhost:3100/api/database/status`

Expected response:
```json
{
  "success": true,
  "message": "All database tables are properly initialized",
  "data": {
    "databaseConnected": true,
    "allTablesExist": true,
    "totalTables": 9,
    "existingTables": 9,
    "tables": [
      {"table": "hospitals", "exists": true, "recordCount": 0},
      {"table": "users", "exists": true, "recordCount": 1},
      // ... other tables
    ]
  }
}
```

#### Test API Health
Visit: `http://localhost:3100/api/health`

### 🛠️ Manual Database Initialization

If automatic initialization fails, you can manually initialize:

**Option 1: Use API Endpoint**
```bash
curl -X POST http://localhost:3100/api/database/initialize
```

**Option 2: Run SQL Scripts**
```bash
# Run the schema file
psql -U postgres -d metahealth_police -f database/schema.sql
```

### 📊 Default Super Admin

The system creates a default super admin:
- **Phone:** 9999999999
- **Email:** superadmin@metahealth.com
- **Role:** super_admin

To login:
1. Generate OTP: `POST http://localhost:3100/api/auth/generate-otp`
2. Verify OTP: `POST http://localhost:3100/api/auth/verify-otp`

### 🔧 Troubleshooting

#### Database Connection Issues
1. Check PostgreSQL is running: `pg_ctl status`
2. Verify connection details in `.env`
3. Test connection: `psql -U postgres -d metahealth_police`

#### Tables Not Created
1. Check database permissions
2. Manually initialize: `POST /api/database/initialize`
3. Check server logs for detailed errors

#### Permission Errors
```bash
# Grant permissions to database user
psql -U postgres
GRANT ALL PRIVILEGES ON DATABASE metahealth_police TO your_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;
```

### 📡 API Endpoints

After setup, these endpoints are available:

- **Health Check:** `GET /api/health`
- **Database Status:** `GET /api/database/status`
- **Hospital Registration:** `POST /api/hospitals/register`
- **Admin Authentication:** `POST /api/auth/generate-otp`
- **Patient Management:** `/api/patients/*`
- **Appointments:** `/api/appointments/*`
- **Document Upload:** `/api/appointment-documents/*`

### 🔒 Security Notes

1. Change default super admin credentials after first login
2. Use strong JWT secret in production
3. Use environment-specific database credentials
4. Enable SSL for production database connections

### 🚀 Production Deployment

For production deployment:
1. Set `NODE_ENV=production`
2. Use secure database credentials
3. Enable SSL database connections
4. Set up proper logging and monitoring
5. Use process manager like PM2

### 📞 Support

If you encounter issues:
1. Check the console logs for detailed error messages
2. Visit `/api/database/status` to check database setup
3. Review the `.env` configuration
4. Ensure PostgreSQL is running and accessible

---

## ✅ Setup Complete!

Your MetaHealth Police application should now be running with all tables automatically created and ready to use! 🎉
