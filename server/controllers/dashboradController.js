const Appointment = require('../models/Appointment');
const MedicalRecord = require('../models/MedicalRecord');
const Prescription = require('../models/Prescription');
const Bill = require('../models/Bill');

// @desc    Get user specific appointments
// @route   GET /api/appointments
export const getAppointments = async (req, res, next) => {
  try {
    // Finds all appointments belonging to the logged-in user
    const data = await Appointment.find({ user: req.user.id });
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

// @desc    Get user specific medical records
// @route   GET /api/records
export const getMedicalRecords = async (req, res, next) => {
  try {
    const data = await MedicalRecord.find({ user: req.user.id });
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

// @desc    Get user specific prescriptions
// @route   GET /api/prescriptions
export const getPrescriptions = async (req, res, next) => {
  try {
    const data = await Prescription.find({ user: req.user.id });
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

// @desc    Get user specific pending bills
// @route   GET /api/bills
export const getPendingBills = async (req, res, next) => {
  try {
    // Fetches only unpaid bills for this specific user
    const data = await Bill.find({ user: req.user.id, status: 'unpaid' });
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};
