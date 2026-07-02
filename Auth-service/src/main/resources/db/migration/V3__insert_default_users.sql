-- Seeding default users for testing the 3 access levels (MASTER, ADMIN, COLABORADOR)
-- All default passwords are 'setoriza123'
-- BCrypt hash for 'setoriza123': $2a$10$Jk80tN4eO9nQ850Xf3x6ye3c2qK.QkS6X87zP9sZ4fA2.P5KjEwT2

INSERT INTO users (id, email, password, name, role, active, created_at, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'master@setoriza.com', '$2a$10$Jk80tN4eO9nQ850Xf3x6ye3c2qK.QkS6X87zP9sZ4fA2.P5KjEwT2', 'Master User', 'MASTER', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-0000-0000-000000000002', 'admin@setoriza.com', '$2a$10$Jk80tN4eO9nQ850Xf3x6ye3c2qK.QkS6X87zP9sZ4fA2.P5KjEwT2', 'Admin User', 'ADMIN', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-0000-0000-000000000003', 'user@setoriza.com', '$2a$10$Jk80tN4eO9nQ850Xf3x6ye3c2qK.QkS6X87zP9sZ4fA2.P5KjEwT2', 'User', 'USER', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;
