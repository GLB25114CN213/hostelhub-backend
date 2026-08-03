const User = require('../models/User');
const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const Bed = require('../models/Bed');
const logger = require('./logger');
const connectDB = require('../config/db');

async function seedData() {
  const count = await User.countDocuments();
  if (count > 0) {
    logger.info('Database already seeded.');
    return;
  }

  logger.info('Seeding initial demo data...');

  const owner = await User.create({
    name: 'Demo Owner',
    email: 'owner@hostelhub.demo',
    phone: '9990001111',
    passwordHash: 'Password123',
    role: 'owner',
    status: 'active',
  });

  const hostel = await Hostel.create({
    name: 'Demo Hostel - Greater Noida',
    owner: owner._id,
    address: { line1: 'Knowledge Park III', city: 'Greater Noida', state: 'UP', pincode: '201310' },
    contactNumber: '9990001111',
    amenities: ['WiFi', 'Laundry', 'Mess', '24x7 Water'],
    genderPolicy: 'co-ed',
  });

  owner.ownedHostels.push(hostel._id);
  await owner.save();

  const warden = await User.create({
    name: 'Demo Warden',
    email: 'warden@hostelhub.demo',
    passwordHash: 'Password123',
    role: 'warden',
    status: 'active',
    hostel: hostel._id,
  });

  const accountant = await User.create({
    name: 'Demo Accountant',
    email: 'accountant@hostelhub.demo',
    passwordHash: 'Password123',
    role: 'accountant',
    status: 'active',
    hostel: hostel._id,
  });

  const room = await Room.create({
    hostel: hostel._id,
    roomNumber: '101',
    floor: 1,
    capacity: 2,
    roomType: 'Non-AC',
    rent: 6000,
    status: 'available',
  });

  await Bed.create([
    { hostel: hostel._id, room: room._id, bedNumber: 'A', status: 'vacant' },
    { hostel: hostel._id, room: room._id, bedNumber: 'B', status: 'vacant' },
  ]);

  logger.info(`Seed complete. Owner: ${owner.email} / Password123 | Warden: ${warden.email} / Password123 | Accountant: ${accountant.email} / Password123`);
}

if (require.main === module) {
  require('dotenv').config();
  const mongoose = require('mongoose');
  (async () => {
    await connectDB();
    await seedData();
    await mongoose.connection.close();
  })().catch((err) => {
    logger.error(err);
    process.exit(1);
  });
}

module.exports = { seedData };
