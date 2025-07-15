# PostgreSQL Database Setup for MetaHealth Police

## Prerequisites

1. **Install PostgreSQL**
   - Download and install PostgreSQL from [https://www.postgresql.org/download/](https://www.postgresql.org/download/)
   - Make sure PostgreSQL service is running

2. **Create Database**
   ```sql
   -- Connect to PostgreSQL as superuser (usually 'postgres')
   psql -U postgres

   -- Create the database
   CREATE DATABASE metahealth_police;

   -- Create a user (optional, you can use postgres user)
   CREATE USER metahealth_user WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE metahealth_police TO metahealth_user;
   ```

## Environment Configuration

1. Copy `.env.example` to `.env`
2. Update the database configuration in `.env`:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=metahealth_police
   DB_USER=postgres
   DB_PASSWORD=your_actual_password
   DATABASE_URL=postgresql://postgres:your_actual_password@localhost:5432/metahealth_police
   ```

## Database Schema

### Hospitals Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `name` | VARCHAR(255) | Hospital name |
| `license_number` | VARCHAR(100) | Unique license number |
| `address_street` | VARCHAR(255) | Street address |
| `address_city` | VARCHAR(100) | City |
| `address_state` | VARCHAR(50) | State/Province |
| `address_zip_code` | VARCHAR(20) | ZIP/Postal code |
| `address_country` | VARCHAR(50) | Country (default: 'USA') |
| `contact_phone` | VARCHAR(20) | Phone number |
| `contact_email` | VARCHAR(255) | Email address |
| `contact_website` | VARCHAR(255) | Website URL (optional) |
| `status` | VARCHAR(20) | Status: 'active', 'inactive', 'suspended' |
| `registration_date` | TIMESTAMP | Registration date (auto-generated) |
| `updated_at` | TIMESTAMP | Last update timestamp (auto-updated) |

### Constraints

- **Unique**: `license_number` must be unique
- **Email Validation**: Email format validation
- **Status Check**: Status must be one of: 'active', 'inactive', 'suspended'
- **Non-empty**: Name and license number cannot be empty

### Indexes

- `idx_hospitals_license_number` - for license number lookups
- `idx_hospitals_name` - for name searches
- `idx_hospitals_status` - for status filtering
- `idx_hospitals_city_state` - for location searches
- `idx_hospitals_registration_date` - for date sorting

## Running Migrations

### Option 1: Manual Setup
```bash
# Connect to PostgreSQL
psql -U postgres -d metahealth_police

# Run the schema file
\i database/schema.sql
```

### Option 2: Using Migration Script
```bash
# Install dependencies first
npm install

# Run the setup script
npm run db:setup
```

### Option 3: Run Individual Migration
```bash
psql -U postgres -d metahealth_police -f database/migrations/001_create_hospitals_table.sql
```

## Sample Data

The schema includes sample hospital data:

1. **Metropolitan General Hospital**
   - License: NYC-HOSP-2024-001
   - Location: Metro City, NY

2. **Central Medical Center**
   - License: CAL-HOSP-2024-002
   - Location: Los Angeles, CA

## Database Connection

The application uses connection pooling with the following default settings:
- Max connections: 20
- Idle timeout: 30 seconds
- Connection timeout: 2 seconds

## Useful Queries

```sql
-- Get all active hospitals
SELECT * FROM hospitals WHERE status = 'active';

-- Search hospitals by city
SELECT * FROM hospitals WHERE address_city = 'Metro City';

-- Get hospital summary view
SELECT * FROM hospital_summary;

-- Check database connection
SELECT NOW();
```

## Troubleshooting

### Connection Issues
1. Verify PostgreSQL is running: `pg_ctl status`
2. Check if database exists: `psql -U postgres -l`
3. Verify user permissions: `psql -U postgres -d metahealth_police -c "\du"`

### Common Errors
- **"database does not exist"**: Create the database first
- **"password authentication failed"**: Check credentials in `.env`
- **"connection refused"**: PostgreSQL service might not be running
