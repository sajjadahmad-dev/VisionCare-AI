// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

// Switch to the eye_health_db database
db = db.getSiblingDB('eye_health_db');

// Create collections if they don't exist
db.createCollection('users');
db.createCollection('doctors');
db.createCollection('analyses');
db.createCollection('appointments');
db.createCollection('questions');
db.createCollection('admins');

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.doctors.createIndex({ "email": 1 }, { unique: true });
db.doctors.createIndex({ "status": 1 });
db.analyses.createIndex({ "user_id": 1, "timestamp": -1 });
db.appointments.createIndex({ "doctor_id": 1, "preferred_date": 1 });
db.appointments.createIndex({ "user_id": 1 });

// Optional: Create a default admin user (uncomment if needed)
/*
db.admins.insertOne({
  "_id": "admin",
  "email": "admin@eyehealth.com",
  "full_name": "Administrator",
  "created_at": new Date()
});
*/

print('Database initialization completed successfully');
