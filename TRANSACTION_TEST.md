# Hospital Registration with Transaction Rollback

## Test Scenarios

### Scenario 1: Successful Registration
Both hospital and user will be created successfully.

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

### Scenario 2: User Creation Fails (Phone/Email Conflict)
If you try to register another hospital with the same phone or email, the entire transaction will be rolled back.

```json
{
  "name": "Another Hospital",
  "licenseNumber": "AH-2024-002",
  "gstNumber": "12BBBBB2222B2Z2", 
  "panNumber": "BBBBB2222B",
  "address": {
    "street": "200 Second Street",
    "city": "Another City",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "contactInfo": {
    "countryCode": "+1",
    "phone": "555-111-2222",
    "email": "different@email.com",
    "pointOfContact": "Dr. Mike Wilson"
  }
}
```

### PowerShell Test Commands

**Test 1 - First Registration (Should succeed):**
```powershell
$headers = @{'Content-Type' = 'application/json'}
$body1 = @'
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
'@

Invoke-RestMethod -Uri 'http://localhost:3100/api/hospitals/register' -Method POST -Headers $headers -Body $body1
```

**Test 2 - Duplicate Phone (Should fail and rollback):**
```powershell
$body2 = @'
{
  "name": "Another Hospital",
  "licenseNumber": "AH-2024-002",
  "gstNumber": "12BBBBB2222B2Z2",
  "panNumber": "BBBBB2222B",
  "address": {
    "street": "200 Second Street",
    "city": "Another City",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "contactInfo": {
    "countryCode": "+1",
    "phone": "555-111-2222",
    "email": "different@email.com",
    "pointOfContact": "Dr. Mike Wilson"
  }
}
'@

Invoke-RestMethod -Uri 'http://localhost:3100/api/hospitals/register' -Method POST -Headers $headers -Body $body2
```

**Verify No Orphaned Records:**
```powershell
# Check hospitals
Invoke-RestMethod -Uri 'http://localhost:3100/api/hospitals' -Method GET

# Check users  
Invoke-RestMethod -Uri 'http://localhost:3100/api/users' -Method GET
```

## Expected Results

1. **First registration**: Creates both hospital and user successfully
2. **Second registration**: Fails with phone conflict error, NO hospital or user created
3. **Database consistency**: Only one hospital and one user should exist

## Transaction Benefits

✅ **Atomicity**: Either both hospital and user are created, or neither  
✅ **Consistency**: No orphaned hospital records without admin users  
✅ **Error Handling**: Clear error messages about what failed  
✅ **Data Integrity**: Phone and email uniqueness enforced across registration
