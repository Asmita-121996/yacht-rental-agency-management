-- YachtFlow database schema setup

-- Drop tables in order of dependency to allow rebuilding schema
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS yachts CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS system_defaults CASCADE;

-- Create Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL,
  designation VARCHAR(50) NOT NULL,
  role VARCHAR(50) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  password VARCHAR(255) NOT NULL
);

-- Create Sessions table for database session tracking
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Yachts table
CREATE TABLE IF NOT EXISTS yachts (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  capacity INTEGER NOT NULL,
  hourly_rate NUMERIC NOT NULL,
  description TEXT
);

-- Create Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR(50) PRIMARY KEY,
  guest_name VARCHAR(150) NOT NULL,
  adults INTEGER NOT NULL,
  children INTEGER NOT NULL DEFAULT 0,
  total_guests INTEGER NOT NULL,
  yacht_id VARCHAR(50) REFERENCES yachts(id) ON DELETE CASCADE,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_hours NUMERIC NOT NULL,
  offered_hourly_rate NUMERIC DEFAULT NULL,
  catering_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  external_service_charges NUMERIC NOT NULL DEFAULT 0,
  decoration_charges NUMERIC NOT NULL DEFAULT 0,
  water_slide_charges NUMERIC NOT NULL DEFAULT 0,
  jet_ski_charges NUMERIC NOT NULL DEFAULT 0,
  catering_charges NUMERIC NOT NULL DEFAULT 0,
  other_charges NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL,
  vat_rate NUMERIC NOT NULL DEFAULT 0,
  vat_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  payment_mode VARCHAR(50) NOT NULL,
  payment_amount NUMERIC NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  sales_person VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  actual_adults INTEGER DEFAULT NULL,
  actual_children INTEGER DEFAULT 0,
  actual_total_guests INTEGER DEFAULT NULL,
  payment_collected_by VARCHAR(50) DEFAULT NULL,
  boarding_status VARCHAR(50) NOT NULL DEFAULT 'Scheduled'
);

-- Create System Defaults table
CREATE TABLE IF NOT EXISTS system_defaults (
  key VARCHAR(50) PRIMARY KEY,
  value VARCHAR(100) NOT NULL
);
