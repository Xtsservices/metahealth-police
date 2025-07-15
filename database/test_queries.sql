-- Test queries for MetaHealth Police database

-- 1. Test connection
SELECT 'Database connection successful!' as message, NOW() as current_time;

-- 2. Check if hospitals table exists
SELECT 
    table_name, 
    table_type 
FROM information_schema.tables 
WHERE table_name = 'hospitals';

-- 3. Get table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'hospitals'
ORDER BY ordinal_position;

-- 4. Count total hospitals
SELECT COUNT(*) as total_hospitals FROM hospitals;

-- 5. Get all hospitals with basic info
SELECT 
    id,
    name,
    license_number,
    CONCAT(address_city, ', ', address_state) as location,
    contact_email,
    status,
    registration_date
FROM hospitals
ORDER BY registration_date DESC;

-- 6. Get active hospitals only
SELECT 
    name,
    license_number,
    contact_phone,
    status
FROM hospitals 
WHERE status = 'active';

-- 7. Search by city (example)
SELECT * FROM hospitals WHERE address_city = 'Metro City';

-- 8. Check indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'hospitals';

-- 9. Test the hospital_summary view
SELECT * FROM hospital_summary LIMIT 5;
