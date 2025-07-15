import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔍 Environment Variables Debug:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? `"${process.env.DB_PASSWORD}"` : 'undefined');
console.log('DB_PASSWORD type:', typeof process.env.DB_PASSWORD);
console.log('DB_PASSWORD length:', process.env.DB_PASSWORD?.length || 0);

// Test if password is empty or undefined
if (!process.env.DB_PASSWORD) {
    console.log('❌ DB_PASSWORD is empty or undefined!');
} else {
    console.log('✅ DB_PASSWORD is set');
}

// Check DATABASE_URL
console.log('DATABASE_URL:', process.env.DATABASE_URL);
