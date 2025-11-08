-- ALTER statement to add 'otp' column to otps table
ALTER TABLE otps 
ADD COLUMN IF NOT EXISTS otp VARCHAR(6);

