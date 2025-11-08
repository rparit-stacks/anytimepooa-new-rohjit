-- ALTER statements to add kundli-related columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS birth_date VARCHAR(50),
ADD COLUMN IF NOT EXISTS birth_time VARCHAR(50),
ADD COLUMN IF NOT EXISTS birth_place VARCHAR(255),
ADD COLUMN IF NOT EXISTS gender VARCHAR(50),
ADD COLUMN IF NOT EXISTS marital_status VARCHAR(50);

-- Also add 'password' column if it doesn't exist (some code uses 'password' instead of 'password_hash')
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password VARCHAR(255);

