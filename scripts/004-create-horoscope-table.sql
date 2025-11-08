-- Horoscope table
CREATE TABLE IF NOT EXISTS horoscopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  date INTEGER NOT NULL,
  hours INTEGER NOT NULL,
  minutes INTEGER NOT NULL,
  seconds INTEGER DEFAULT 0,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  timezone DECIMAL(4,2) NOT NULL,
  observation_point VARCHAR(20) DEFAULT 'topocentric',
  ayanamsha VARCHAR(20) DEFAULT 'lahiri',
  language VARCHAR(10) DEFAULT 'en',
  horoscope_type VARCHAR(50) DEFAULT 'vedic', -- vedic, western
  chart_type VARCHAR(50), -- planets, navamsa, hora, etc.
  chart_data JSONB,
  chart_image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_horoscopes_user_id ON horoscopes(user_id);
CREATE INDEX IF NOT EXISTS idx_horoscopes_created_at ON horoscopes(created_at DESC);

