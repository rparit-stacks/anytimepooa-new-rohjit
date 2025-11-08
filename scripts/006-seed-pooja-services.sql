-- Seed Pooja Services
INSERT INTO pooja_services (name, description, image_url, base_price, duration_hours) VALUES
('Ganesh Pooja', 'Ganesh Pooja for removing obstacles and bringing prosperity', 'https://images.unsplash.com/photo-1601370690183-1c7796ecec78?w=400&h=300&fit=crop&q=80', 1500.00, 2),
('Lakshmi Pooja', 'Lakshmi Pooja for wealth and prosperity', 'https://images.unsplash.com/photo-1601370690183-1c7796ecec78?w=400&h=300&fit=crop&q=80', 2000.00, 2),
('Satyanarayan Pooja', 'Satyanarayan Pooja for peace and happiness', 'https://images.unsplash.com/photo-1601370690183-1c7796ecec78?w=400&h=300&fit=crop&q=80', 1800.00, 3),
('Rudrabhishek', 'Rudrabhishek for health and protection', 'https://images.unsplash.com/photo-1601370690183-1c7796ecec78?w=400&h=300&fit=crop&q=80', 2500.00, 3),
('Havan', 'Havan for purification and positive energy', 'https://images.unsplash.com/photo-1601370690183-1c7796ecec78?w=400&h=300&fit=crop&q=80', 1200.00, 2),
('Griha Pravesh Pooja', 'Griha Pravesh Pooja for new home blessing', 'https://images.unsplash.com/photo-1601370690183-1c7796ecec78?w=400&h=300&fit=crop&q=80', 3000.00, 4),
('Maha Mrityunjaya Jaap', 'Maha Mrityunjaya Jaap for health and longevity', 'https://images.unsplash.com/photo-1601370690183-1c7796ecec78?w=400&h=300&fit=crop&q=80', 2200.00, 2),
('Navagraha Pooja', 'Navagraha Pooja for planetary peace', 'https://images.unsplash.com/photo-1601370690183-1c7796ecec78?w=400&h=300&fit=crop&q=80', 2800.00, 3)
ON CONFLICT DO NOTHING;


