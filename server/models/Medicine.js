const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  medicineId: { type: String, unique: true },
  medicineName: { type: String, required: true, trim: true },
  description: { type: String },
  category: { type: String },
  stock: { type: Number, default: 0, min: 0 },
  price: { type: Number, required: true, min: 0 },
  manufacturer: { type: String },
  expiryDate: { type: Date }
}, { timestamps: true });

medicineSchema.pre('validate', async function (next) {
  if (!this.medicineId) {
    const count = await mongoose.model('Medicine').countDocuments();
    this.medicineId = 'MED-' + String(count + 1).padStart(5, '0');
  }
  next();
});

module.exports = mongoose.model('Medicine', medicineSchema);
