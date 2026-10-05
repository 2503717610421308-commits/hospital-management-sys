const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Nurse = require('../models/Nurse');
const Receptionist = require('../models/Receptionist');
const Department = require('../models/Department');
const Appointment = require('../models/Appointment');
const Medicine = require('../models/Medicine');
const MedicalRecord = require('../models/MedicalRecord');
const Prescription = require('../models/Prescription');
const Bill = require('../models/Bill');
const Notification = require('../models/Notification');
const SystemSetting = require('../models/SystemSetting');

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for seeding...');

    // Clear all collections
    await Promise.all([
      User.deleteMany(), Patient.deleteMany(), Doctor.deleteMany(), Nurse.deleteMany(),
      Receptionist.deleteMany(), Department.deleteMany(), Appointment.deleteMany(),
      Medicine.deleteMany(), MedicalRecord.deleteMany(), Prescription.deleteMany(),
      Bill.deleteMany(), Notification.deleteMany(), SystemSetting.deleteMany()
    ]);
    console.log('All collections cleared.');

    // Create departments
    const departments = await Department.insertMany([
      { departmentId: 'DEPT-001', departmentName: 'Cardiology', description: 'Heart and cardiovascular system', location: 'Building A, Floor 2' },
      { departmentId: 'DEPT-002', departmentName: 'Neurology', description: 'Brain and nervous system', location: 'Building A, Floor 3' },
      { departmentId: 'DEPT-003', departmentName: 'Orthopedics', description: 'Bones, joints and muscles', location: 'Building B, Floor 1' },
      { departmentId: 'DEPT-004', departmentName: 'Pediatrics', description: 'Children healthcare', location: 'Building B, Floor 2' },
      { departmentId: 'DEPT-005', departmentName: 'Dermatology', description: 'Skin, hair and nails', location: 'Building C, Floor 1' },
      { departmentId: 'DEPT-006', departmentName: 'General Medicine', description: 'General healthcare services', location: 'Building A, Floor 1' },
      { departmentId: 'DEPT-007', departmentName: 'ENT', description: 'Ear, nose and throat', location: 'Building C, Floor 2' },
      { departmentId: 'DEPT-008', departmentName: 'Ophthalmology', description: 'Eye care and surgery', location: 'Building C, Floor 3' }
    ]);
    console.log('Departments seeded.');

    // Create Admin
    const adminUser = await User.create({ name: 'Admin User', email: 'admin@hospital.com', password: 'Admin@123', role: 'admin', phone: '9000000001' });

    // Create Doctor users and profiles
    const docUser1 = await User.create({ name: 'Dr. Rajesh Kumar', email: 'doctor@hospital.com', password: 'Doctor@123', role: 'doctor', phone: '9000000002' });
    const docUser2 = await User.create({ name: 'Dr. Priya Sharma', email: 'priya.sharma@hospital.com', password: 'Doctor@123', role: 'doctor', phone: '9000000006' });
    const docUser3 = await User.create({ name: 'Dr. Amit Patel', email: 'amit.patel@hospital.com', password: 'Doctor@123', role: 'doctor', phone: '9000000007' });

    const doctor1 = await Doctor.create({
      userId: docUser1._id, name: 'Dr. Rajesh Kumar', phone: '9000000002', email: 'doctor@hospital.com',
      specialization: 'Cardiologist', departmentId: departments[0]._id, experience: 12, consultationFee: 800,
      availability: { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], startTime: '09:00', endTime: '17:00', slotDuration: 30 }
    });
    const doctor2 = await Doctor.create({
      userId: docUser2._id, name: 'Dr. Priya Sharma', phone: '9000000006', email: 'priya.sharma@hospital.com',
      specialization: 'Neurologist', departmentId: departments[1]._id, experience: 8, consultationFee: 700
    });
    const doctor3 = await Doctor.create({
      userId: docUser3._id, name: 'Dr. Amit Patel', phone: '9000000007', email: 'amit.patel@hospital.com',
      specialization: 'Orthopedic Surgeon', departmentId: departments[2]._id, experience: 15, consultationFee: 1000
    });

    // Create Nurse
    const nurseUser = await User.create({ name: 'Nurse Anita Singh', email: 'nurse@hospital.com', password: 'Nurse@123', role: 'nurse', phone: '9000000003' });
    await Nurse.create({ userId: nurseUser._id, name: 'Nurse Anita Singh', phone: '9000000003', shift: 'Morning', departmentId: departments[0]._id });

    // Create Receptionist
    const recUser = await User.create({ name: 'Meera Joshi', email: 'receptionist@hospital.com', password: 'Receptionist@123', role: 'receptionist', phone: '9000000004' });
    await Receptionist.create({ userId: recUser._id, name: 'Meera Joshi', phone: '9000000004', shift: 'Morning' });

    // Create Patient
    const patUser = await User.create({ name: 'Rahul Verma', email: 'patient@hospital.com', password: 'Patient@123', role: 'patient', phone: '9000000005' });
    const patient1 = await Patient.create({
      userId: patUser._id, name: 'Rahul Verma', phone: '9000000005', email: 'patient@hospital.com',
      dateOfBirth: new Date('1995-06-15'), gender: 'Male', address: '123 Main Street, Mumbai',
      bloodGroup: 'O+', emergencyContact: { name: 'Suresh Verma', phone: '9000000099', relation: 'Father' }
    });

    // Create second patient
    const patUser2 = await User.create({ name: 'Sunita Devi', email: 'sunita@hospital.com', password: 'Patient@123', role: 'patient', phone: '9000000008' });
    const patient2 = await Patient.create({
      userId: patUser2._id, name: 'Sunita Devi', phone: '9000000008', email: 'sunita@hospital.com',
      dateOfBirth: new Date('1988-03-22'), gender: 'Female', address: '456 Park Road, Delhi', bloodGroup: 'A+'
    });

    console.log('Users seeded.');

    // Create Medicines
    const medicines = await Medicine.insertMany([
      { medicineId: 'MED-00001', medicineName: 'Paracetamol 500mg', description: 'Pain reliever and fever reducer', category: 'Analgesic', stock: 500, price: 5, manufacturer: 'Cipla' },
      { medicineId: 'MED-00002', medicineName: 'Amoxicillin 250mg', description: 'Antibiotic', category: 'Antibiotic', stock: 300, price: 12, manufacturer: 'Sun Pharma' },
      { medicineId: 'MED-00003', medicineName: 'Omeprazole 20mg', description: 'Reduces stomach acid', category: 'Antacid', stock: 200, price: 8, manufacturer: 'Dr. Reddy' },
      { medicineId: 'MED-00004', medicineName: 'Metformin 500mg', description: 'Diabetes medication', category: 'Antidiabetic', stock: 400, price: 6, manufacturer: 'Lupin' },
      { medicineId: 'MED-00005', medicineName: 'Amlodipine 5mg', description: 'Blood pressure medication', category: 'Antihypertensive', stock: 350, price: 10, manufacturer: 'Cipla' },
      { medicineId: 'MED-00006', medicineName: 'Cetirizine 10mg', description: 'Antihistamine for allergies', category: 'Antihistamine', stock: 600, price: 4, manufacturer: 'Sun Pharma' },
      { medicineId: 'MED-00007', medicineName: 'Ibuprofen 400mg', description: 'Anti-inflammatory', category: 'NSAID', stock: 450, price: 7, manufacturer: 'Mankind' },
      { medicineId: 'MED-00008', medicineName: 'Azithromycin 500mg', description: 'Antibiotic for infections', category: 'Antibiotic', stock: 250, price: 15, manufacturer: 'Cipla' }
    ]);
    console.log('Medicines seeded.');

    // Create Appointments
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);

    const apt1 = await Appointment.create({
      patientId: patient1._id, doctorId: doctor1._id, departmentId: departments[0]._id,
      appointmentDate: tomorrow, appointmentTime: '10:00', reason: 'Chest pain and discomfort', status: 'Confirmed'
    });
    const apt2 = await Appointment.create({
      patientId: patient2._id, doctorId: doctor2._id, departmentId: departments[1]._id,
      appointmentDate: tomorrow, appointmentTime: '11:00', reason: 'Recurring headaches', status: 'Confirmed'
    });
    const apt3 = await Appointment.create({
      patientId: patient1._id, doctorId: doctor3._id, departmentId: departments[2]._id,
      appointmentDate: nextWeek, appointmentTime: '14:00', reason: 'Knee pain', status: 'Pending'
    });

    // Create a completed appointment with medical record
    const pastDate = new Date(today); pastDate.setDate(today.getDate() - 5);
    const apt4 = await Appointment.create({
      patientId: patient1._id, doctorId: doctor1._id, departmentId: departments[0]._id,
      appointmentDate: pastDate, appointmentTime: '09:30', reason: 'Regular checkup', status: 'Completed'
    });

    console.log('Appointments seeded.');

    // Create Medical Record
    const medRecord = await MedicalRecord.create({
      patientId: patient1._id, doctorId: doctor1._id, appointmentId: apt4._id,
      diagnosis: 'Mild hypertension', symptoms: ['High blood pressure', 'Headache', 'Fatigue'],
      treatment: 'Prescribed Amlodipine 5mg daily. Recommended lifestyle changes.',
      notes: 'Patient advised to reduce salt intake and exercise regularly.',
      vitals: { bloodPressure: '140/90', heartRate: '82 bpm', temperature: '98.6°F', weight: '75 kg', height: '175 cm', oxygenSaturation: '98%' },
      testResults: [{ testName: 'Blood Pressure', result: '140/90 mmHg', date: pastDate, notes: 'Slightly elevated' }]
    });

    // Create Prescription
    const prescription = await Prescription.create({
      patientId: patient1._id, doctorId: doctor1._id, appointmentId: apt4._id,
      medicines: [
        { medicineId: medicines[4]._id, medicineName: 'Amlodipine 5mg', dosage: '5mg', frequency: 'Once daily', duration: '30 days', quantity: 30 },
        { medicineId: medicines[0]._id, medicineName: 'Paracetamol 500mg', dosage: '500mg', frequency: 'As needed', duration: '7 days', quantity: 14 }
      ],
      instructions: 'Take Amlodipine in the morning after breakfast. Paracetamol only if headache persists.'
    });

    // Create Bill
    const bill = await Bill.create({
      patientId: patient1._id, appointmentId: apt4._id,
      items: [
        { description: 'Consultation Fee - Dr. Rajesh Kumar', category: 'Consultation', amount: 800 },
        { description: 'Amlodipine 5mg x 30', category: 'Medicine', amount: 300 },
        { description: 'Paracetamol 500mg x 14', category: 'Medicine', amount: 70 },
        { description: 'Blood Pressure Test', category: 'Lab', amount: 200 }
      ],
      tax: 50, discount: 100
    });

    console.log('Medical records, prescriptions and bills seeded.');

    // Create notifications
    await Notification.insertMany([
      { userId: patUser._id, title: 'Welcome!', message: 'Welcome to Hospital Management System. Your account has been created.', type: 'general' },
      { userId: patUser._id, title: 'Appointment Confirmed', message: `Your appointment on ${tomorrow.toLocaleDateString()} at 10:00 AM has been confirmed.`, type: 'appointment' },
      { userId: docUser1._id, title: 'New Appointment', message: 'You have a new appointment tomorrow at 10:00 AM.', type: 'appointment' }
    ]);

    // Create system settings
    await SystemSetting.insertMany([
      { key: 'hospital_name', value: 'City General Hospital', description: 'Name of the hospital', category: 'general' },
      { key: 'hospital_address', value: '100 Medical Center Drive, Mumbai 400001', description: 'Hospital address', category: 'general' },
      { key: 'hospital_phone', value: '+91 22 1234 5678', description: 'Hospital phone number', category: 'general' },
      { key: 'hospital_email', value: 'info@citygeneralhospital.com', description: 'Hospital email', category: 'general' },
      { key: 'appointment_slot_duration', value: 30, description: 'Default appointment slot duration in minutes', category: 'appointment' },
      { key: 'tax_percentage', value: 5, description: 'Tax percentage for billing', category: 'billing' },
      { key: 'currency', value: 'INR', description: 'Currency symbol', category: 'billing' }
    ]);

    console.log('\n========================================');
    console.log('  DATABASE SEEDED SUCCESSFULLY!');
    console.log('========================================');
    console.log('\nDemo Credentials:');
    console.log('------------------------------------------');
    console.log('Admin:        admin@hospital.com / Admin@123');
    console.log('Doctor:       doctor@hospital.com / Doctor@123');
    console.log('Nurse:        nurse@hospital.com / Nurse@123');
    console.log('Receptionist: receptionist@hospital.com / Receptionist@123');
    console.log('Patient:      patient@hospital.com / Patient@123');
    console.log('------------------------------------------\n');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedDB();
