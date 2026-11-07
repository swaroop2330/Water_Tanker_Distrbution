CREATE DATABASE IF NOT EXISTS water_tanker_db;
USE water_tanker_db;

CREATE TABLE IF NOT EXISTS villages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  district VARCHAR(100) NOT NULL,
  name VARCHAR(150) NOT NULL,
  population INT NOT NULL,
  required_liters BIGINT NOT NULL,
  available_liters BIGINT NOT NULL DEFAULT 0,
  severity INT NOT NULL DEFAULT 50,
  distance_km DECIMAL(8,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tankers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tanker_code VARCHAR(50) UNIQUE NOT NULL,
  capacity_liters INT NOT NULL,
  status ENUM('AVAILABLE','ON_TRIP','MAINTENANCE') DEFAULT 'AVAILABLE'
);

CREATE TABLE IF NOT EXISTS schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  village_id INT NOT NULL,
  tanker_id INT,
  allocated_liters INT NOT NULL,
  eta_minutes INT,
  schedule_status VARCHAR(30) DEFAULT 'SCHEDULED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (village_id) REFERENCES villages(id),
  FOREIGN KEY (tanker_id) REFERENCES tankers(id)
);
