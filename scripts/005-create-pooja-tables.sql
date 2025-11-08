-- Pooja Services table
CREATE TABLE IF NOT EXISTS pooja_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  base_price DECIMAL(10,2) NOT NULL,
  duration_hours INTEGER DEFAULT 2,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Pooja Bookings table
CREATE TABLE IF NOT EXISTS pooja_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pooja_service_id UUID NOT NULL REFERENCES pooja_services(id) ON DELETE CASCADE,
  astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  total_amount DECIMAL(10,2) NOT NULL,
  astrologer_price DECIMAL(10,2) NOT NULL,
  service_price DECIMAL(10,2) NOT NULL,
  distance_km DECIMAL(8,2),
  status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, completed, cancelled
  special_instructions TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_pooja_bookings_user_id ON pooja_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_pooja_bookings_astrologer_id ON pooja_bookings(astrologer_id);
CREATE INDEX IF NOT EXISTS idx_pooja_bookings_status ON pooja_bookings(status);
CREATE INDEX IF NOT EXISTS idx_pooja_services_is_active ON pooja_services(is_active);

