INSERT INTO training_slots (slot_date, slot_time, duration_minutes, status) VALUES
('2025-12-18', '10:00:00', 60, 'available'),
('2025-12-18', '12:00:00', 60, 'available'),
('2025-12-18', '14:00:00', 60, 'available'),
('2025-12-18', '16:00:00', 60, 'available'),
('2025-12-18', '18:00:00', 60, 'available'),
('2025-12-19', '10:00:00', 60, 'available'),
('2025-12-19', '12:00:00', 60, 'available'),
('2025-12-19', '14:00:00', 60, 'available'),
('2025-12-19', '16:00:00', 60, 'available'),
('2025-12-19', '18:00:00', 60, 'available'),
('2025-12-20', '10:00:00', 60, 'available'),
('2025-12-20', '12:00:00', 60, 'available'),
('2025-12-20', '14:00:00', 60, 'available'),
('2025-12-20', '16:00:00', 60, 'available'),
('2025-12-20', '18:00:00', 60, 'available')
ON CONFLICT (slot_date, slot_time) DO NOTHING