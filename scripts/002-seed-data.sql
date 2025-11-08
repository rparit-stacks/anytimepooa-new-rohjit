-- Insert sample categories
INSERT INTO categories (name, display_order) VALUES
  ('Tarot', 1),
  ('Vedic', 2),
  ('Numerology', 3),
  ('Astrology', 4),
  ('Palmistry', 5)
ON CONFLICT (name) DO NOTHING;

-- Insert sample astrologers
INSERT INTO astrologers (name, email, phone, avatar_url, bio, specializations, rating, review_count, languages, price_per_session, location, latitude, longitude, is_available) VALUES
  ('Dr. Ravi Kumar', 'ravi@astrologers.com', '+91-9876543210', '/placeholder.svg?height=80&width=80', 'Expert in Vedic Astrology with 15+ years experience', ARRAY['Vedic', 'Palmistry'], 4.8, 245, ARRAY['Hindi', 'English'], 500.00, 'Mumbai', 19.0760, 72.8777, true),
  ('Priya Sharma', 'priya@astrologers.com', '+91-9876543211', '/placeholder.svg?height=80&width=80', 'Specializes in Tarot and Life Guidance', ARRAY['Tarot', 'Numerology'], 4.9, 382, ARRAY['English', 'Hindi'], 600.00, 'Delhi', 28.7041, 77.1025, true),
  ('Amit Patel', 'amit@astrologers.com', '+91-9876543212', '/placeholder.svg?height=80&width=80', 'Numerology & Financial Planning Expert', ARRAY['Numerology', 'Astrology'], 4.7, 156, ARRAY['Gujarati', 'English'], 400.00, 'Ahmedabad', 23.0225, 72.5714, true)
ON CONFLICT DO NOTHING;

-- Insert sample offers
INSERT INTO offers (title, description, discount_percent, image_url, valid_from, valid_till, is_active) VALUES
  ('New Year Special - 50% Off', 'Get 50% discount on your first consultation with any astrologer', 50, '/placeholder.svg?height=100&width=300', NOW(), NOW() + INTERVAL '30 days', true),
  ('Weekend Bonanza - Free Session', 'Book a consultation on weekends and get a free follow-up', NULL, '/placeholder.svg?height=100&width=300', NOW(), NOW() + INTERVAL '7 days', true),
  ('Referral Program - Earn Credits', 'Refer a friend and earn 200 credits on your wallet', NULL, '/placeholder.svg?height=100&width=300', NOW(), NOW() + INTERVAL '90 days', true)
ON CONFLICT DO NOTHING;

-- Insert sample testimonials
INSERT INTO testimonials (user_id, astrologer_id, rating, review_text, user_avatar_url) 
SELECT u.id, a.id, 5, 'Amazing consultation! Very accurate predictions and helpful guidance.', '/placeholder.svg?height=40&width=40'
FROM users u, astrologers a 
WHERE u.email IS NOT NULL AND a.name = 'Priya Sharma'
LIMIT 1
ON CONFLICT DO NOTHING;
