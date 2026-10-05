const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  departmentId: { type: String, unique: true },
  departmentName: { type: String, required: true, unique: true, trim: true },
  description: { type: String },
  location: { type: String },
  headDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

departmentSchema.pre('validate', async function (next) {
  if (!this.departmentId) {
    const count = await mongoose.model('Department').countDocuments();
    this.departmentId = 'DEPT-' + String(count + 1).padStart(3, '0');
  }
  next();
});

module.exports = mongoose.model('Department', departmentSchema);
