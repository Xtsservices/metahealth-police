# MetaHealth Police - Hospital Management System

A comprehensive hospital management system built with Node.js, TypeScript, and PostgreSQL featuring hospital registration, user management, and Super Admin dashboard with approval workflows.

## Features

### Core Functionality
- 🏥 **Hospital Registration** - Complete hospital onboarding with validation
- 👥 **User Management** - Hospital admin and staff user management  
- 📊 **Super Admin Dashboard** - Hospital approval and monitoring
- 🔒 **Transactional Integrity** - Atomic operations for data consistency
- ✅ **Validation & Unique Constraints** - Data integrity enforcement

### Super Admin Features
- **Hospital Approval Workflow** - Approve/reject pending hospitals
- **Dashboard Statistics** - Real-time counts and status overview
- **User Status Management** - Approve users with hospital approval
- **Audit Trail** - Track approval/rejection with timestamps and reasons

## Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository>
cd metahealth-police
npm install
```

2. **Set up environment:**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. **Set up database:**
```bash
# Create database
createdb metahealth_police

# Run migrations
psql -d metahealth_police -f database/schema.sql
psql -d metahealth_police -f database/migrations/001_create_hospitals_table.sql
psql -d metahealth_police -f database/migrations/002_add_gst_pan_mobile.sql
psql -d metahealth_police -f database/migrations/003_add_approval_fields.sql
psql -d metahealth_police -f database/migrations/004_create_auth_tables.sql
psql -d metahealth_police -f database/migrations/005_update_users_for_super_admin.sql
psql -d metahealth_police -f database/migrations/006_add_approval_tracking_columns.sql

# OR run via Node.js scripts:
node run-users-migration.js
node run-approval-migration.js
```

**⚠️ Important:** Run migration `005_update_users_for_super_admin.sql` to fix the users table for super admin support!

4. **Start the server:**
```bash
npm run dev    # Development mode
npm start      # Production mode
```

The server will automatically:
- ✅ Test database connection
- 👑 Create default Super Admin user (if none exists)
- 🚀 Start all API endpoints

**Default Super Admin:** Phone `+91-9999999999` will be ready for OTP login!

## API Endpoints

### Hospital Management
```
POST   /api/hospitals/register     # Register new hospital
GET    /api/hospitals              # Get all hospitals
GET    /api/hospitals/:id          # Get hospital by ID
PATCH  /api/hospitals/:id/status   # Update hospital status
```

### User Management
```
POST   /api/users                  # Create new user
GET    /api/users                  # Get all users
GET    /api/users/:id              # Get user by ID
PATCH  /api/users/:id/status       # Update user status
GET    /api/users/hospital/:id     # Get users by hospital
```

### Mobile OTP Authentication
```
POST   /api/auth/check-phone       # Check if phone number exists
POST   /api/auth/generate-otp      # Generate OTP for mobile login
POST   /api/auth/verify-otp        # Verify OTP and login
POST   /api/auth/logout            # Logout user
GET    /api/auth/validate-session  # Validate session token
```

**🔐 Token Authentication Features:**
- Session-based authentication with database validation
- UUID-format session tokens with expiration
- Role-based access control (super_admin, hospital_admin, etc.)
- Automatic session cleanup and user status validation
- Support for Authorization header or query parameter token
```
POST   /api/auth/generate-otp      # Generate OTP for mobile login
POST   /api/auth/verify-otp        # Verify OTP and login
POST   /api/auth/logout            # Logout user
GET    /api/auth/validate-session  # Validate session token
```

### Super Admin Dashboard
```
GET    /api/dashboard/stats                    # Dashboard statistics
GET    /api/dashboard/hospitals               # Hospital status overview (supports ?status= filter)
GET    /api/dashboard/users-by-hospital       # User stats by hospital
GET    /api/dashboard/pending-hospitals       # Hospitals pending approval
PUT    /api/dashboard/approve-hospital/:id    # Approve hospital & admin
PUT    /api/dashboard/reject-hospital/:id     # Reject hospital application
```

**🔐 Authentication Required:** All dashboard endpoints require:
- Valid session token in `Authorization: Bearer <token>` header
- Super admin role (`super_admin`)
- Active user status

**Example with Authentication:**
```bash
# 1. Login and get token
POST /api/auth/verify-otp
{
  "phone": "9999999999",
  "otp": "123456"
}

# 2. Use token for dashboard access
GET /api/dashboard/stats
Authorization: Bearer <session_token>
```

**Hospital Status Filtering & Pagination:**
- `GET /api/dashboard/hospitals?status=active` - Active hospitals only
- `GET /api/dashboard/hospitals?status=inactive` - Inactive hospitals only  
- `GET /api/dashboard/hospitals?status=suspended` - Suspended hospitals only
- `GET /api/dashboard/hospitals?status=rejected` - Rejected hospitals only

**Pagination Parameters:**
- `page` - Page number (default: 1, minimum: 1)
- `limit` - Records per page (default: 10, range: 1-100)

**Combined Examples:**
- `GET /api/dashboard/hospitals?page=2&limit=5` - Page 2 with 5 records
- `GET /api/dashboard/hospitals?status=active&page=1&limit=20` - Active hospitals, page 1, 20 records
- `GET /api/dashboard/pending-hospitals?page=1&limit=10` - Pending hospitals with pagination

## Hospital Approval Workflow

### 1. Hospital Registration
When a hospital registers, both the hospital and admin user are created with `inactive` status.

### 2. Super Admin Review
Super Admin can:
- View pending hospitals: `GET /api/dashboard/pending-hospitals`
- See hospital details and admin user information
- Review application completeness

## Default Super Admin

### Automatic Creation
When the server starts, a default Super Admin user is automatically created if none exists:

**Default Credentials:**
- 📱 **Phone:** `+91-9999999999`
- 📧 **Email:** `superadmin@metahealth.com`
- 👤 **Name:** `Super Admin`
- 🔑 **Role:** `super_admin`
- ✅ **Status:** `active`

### First Time Login
1. **Start the server:** The default Super Admin is created automatically
2. **Generate OTP:** Use the phone number `+91-9999999999`
3. **Login:** Verify OTP to access Super Admin dashboard
4. **Access Dashboard:** Navigate to `/api/dashboard/stats`

### Check Phone Existence
Verify if a phone number exists in the system:
```bash
POST /api/auth/check-phone
Content-Type: application/json

{
  "phone": "+91-9999999999"
}
```

**Response:**
```json
{
  "success": true,
  "exists": true,
  "message": "Phone number found in system",
  "user": {
    "id": "uuid",
    "name": "Super Admin",
    "phone": "+91-9999999999",
    "email": "superadmin@metahealth.com",
    "role": "super_admin",
    "status": "active",
    "hospital_id": null,
    "hospital_name": null,
    "hospital_status": null
  }
}
```

## Mobile OTP Authentication

### 1. Generate OTP
Request OTP for mobile login:
```bash
POST /api/auth/generate-otp
Content-Type: application/json

{
  "phone": "555-111-2222"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully to your mobile number",
  "data": {
    "phone": "555-111-2222",
    "otpExpiry": "2024-01-15T10:35:00Z",
    "otp": "123456"  // Only in development mode
  }
}
```

### 2. Verify OTP and Login
Verify OTP to complete login:
```bash
POST /api/auth/verify-otp
Content-Type: application/json

{
  "phone": "555-111-2222",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user-uuid",
      "name": "Dr. Sarah Johnson",
      "phone": "555-111-2222",
      "email": "admin@citygeneral.com",
      "role": "hospital_admin",
      "status": "active"
    },
    "hospital": {
      "id": "hospital-uuid",
      "name": "City General Hospital",
      "license_number": "CGH-2024-001",
      "status": "active"
    },
    "session": {
      "token": "session-uuid-token",
      "expiresAt": "2024-01-16T10:30:00Z"
    }
  }
}
```

### 3. Session Management
**Validate Session:**
```bash
GET /api/auth/validate-session?token={session-token}
```

**Logout:**
```bash
POST /api/auth/logout
Content-Type: application/json

{
  "token": "session-uuid-token"
}
```

### Security Features
- ✅ **OTP Expiry**: 5 minutes validity
- ✅ **Single Use**: OTP can only be used once
- ✅ **Session Management**: 24-hour session validity
- ✅ **User Validation**: Only active users can login
- ✅ **Phone Sanitization**: Automatic phone number formatting
- ✅ **Rate Limiting**: One session per user

## Sample Payloads

### Hospital Registration
```json
{
  "name": "City General Hospital",
  "licenseNumber": "CGH-2024-001",
  "gstNumber": "12AAAAA1111A1Z1",
  "panNumber": "AAAAA1111A",
  "address": {
    "street": "100 Main Street",
    "city": "Cityville",
    "state": "CA",
    "zipCode": "90210",
    "country": "USA"
  },
  "contactInfo": {
    "countryCode": "+1",
    "phone": "555-111-2222", 
    "email": "admin@citygeneral.com",
    "pointOfContact": "Dr. Sarah Johnson"
  }
}
```

### User Creation
```json
{
  "name": "Dr. John Smith",
  "phone": "555-123-4567",
  "email": "john.smith@hospital.com",
  "role": "doctor",
  "hospitalId": "hospital-uuid-here"
}
```

### Pagination Response Format
```json
{
  "success": true,
  "message": "Hospital status overview retrieved successfully",
  "data": [
    {
      "id": "hospital-uuid",
      "name": "City General Hospital",
      "licenseNumber": "CGH-2024-001",
      "status": "active",
      "registrationDate": "2024-01-15T10:30:00Z",
      "location": "Cityville, CA",
      "userCount": 5
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalRecords": 25,
    "recordsPerPage": 10,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "count": 10,
  "filter": { "status": "active" }
}
```

## Testing

### PowerShell Test Scripts
- `examples/test-hospital-approval.ps1` - Test approval workflow
- `examples/test-hospital-rejection.ps1` - Test rejection workflow
- `examples/sample-hospital-registration.json` - Sample registration data

### Run Tests
```bash
# Start server first
npm start

# Run approval tests
powershell -File examples/test-hospital-approval.ps1

# Run rejection tests  
powershell -File examples/test-hospital-rejection.ps1
```

## Database Schema

### Key Tables
- **hospitals** - Hospital information with approval tracking
- **users** - User accounts linked to hospitals
- **Unique Constraints** - license_number, gst_number, pan_number, phone, email

### Status Values
- `inactive` - Newly registered, pending approval
- `active` - Approved and operational
- `suspended` - Temporarily disabled
- `rejected` - Application rejected

## Environment Variables

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=metahealth_police
DB_USER=your_username
DB_PASSWORD=your_password

# Server
PORT=3100
NODE_ENV=development
```

## Project Structure

```
src/
├── config/
│   └── database.ts          # Database connection
├── controllers/
│   ├── DashboardController.ts    # Super Admin dashboard
│   ├── HospitalController.ts     # Hospital operations
│   ├── PostgreSQLHospitalController.ts  # DB hospital ops
│   └── UserController.ts         # User management
├── middleware/
│   ├── validation.ts             # Hospital validation
│   └── userValidation.ts         # User validation
├── models/
│   ├── Hospital.ts               # Hospital interface
│   └── User.ts                   # User interface
├── routes/
│   ├── api.ts                    # Base API routes
│   ├── dashboard.ts              # Dashboard routes
│   ├── hospitals.ts              # Hospital routes
│   └── users.ts                  # User routes
└── index.ts                      # Server entry point

database/
├── schema.sql                    # Initial schema
├── migrations/                   # Database migrations
└── test_queries.sql             # Test queries

examples/
├── test-hospital-approval.ps1   # Approval test script
├── test-hospital-rejection.ps1  # Rejection test script
└── sample-hospital-registration.json
```

## Key Features Implemented

✅ **Transactional Registration** - Hospital and admin user created atomically  
✅ **Unique Constraints** - Prevents duplicate licenses, GST, PAN, phone, email  
✅ **Approval Workflow** - Super Admin can approve/reject hospitals  
✅ **Status Management** - Track hospital and user status changes  
✅ **Audit Trail** - Record who approved/rejected and when  
✅ **Dashboard Analytics** - Real-time statistics and counts  
✅ **Error Handling** - Comprehensive error responses and rollbacks  
✅ **Validation** - Input validation for all endpoints  

## License

This project is licensed under the MIT License.

## Support

For questions or issues, please contact the development team.
