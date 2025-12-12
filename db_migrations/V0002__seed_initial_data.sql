INSERT INTO clients (full_name, phone, email) VALUES 
('Анна Николаева', '+79991234567', 'anna@example.com'),
('Мария Петрова', '+79991234568', 'maria@example.com'),
('Елена Сидорова', '+79991234569', 'elena@example.com');

INSERT INTO subscriptions (client_id, type, total_sessions, remaining_sessions, valid_until) VALUES 
(1, 'Индивидуальные тренировки', 8, 5, '2025-01-31'),
(2, 'Индивидуальные тренировки', 12, 10, '2025-02-28'),
(3, 'Индивидуальные тренировки', 8, 3, '2025-01-20');

INSERT INTO bookings (client_id, subscription_id, booking_date, booking_time, status) VALUES 
(1, 1, '2025-01-15', '10:00', 'upcoming'),
(1, 1, '2025-01-18', '14:00', 'upcoming'),
(1, 1, '2024-12-10', '16:00', 'completed'),
(2, 2, '2025-01-16', '11:00', 'upcoming'),
(3, 3, '2025-01-14', '17:00', 'upcoming');

INSERT INTO schedule_templates (day_of_week, start_time, end_time, slot_duration_minutes) VALUES 
(1, '09:00', '22:00', 60),
(2, '09:00', '22:00', 60),
(3, '09:00', '22:00', 60),
(4, '09:00', '22:00', 60),
(5, '09:00', '22:00', 60),
(6, '10:00', '20:00', 60),
(0, '10:00', '20:00', 60);

INSERT INTO blocked_slots (block_date, block_time, reason) VALUES 
('2025-01-15', '13:00', 'Технический перерыв'),
('2025-01-15', '17:00', 'Личные дела');