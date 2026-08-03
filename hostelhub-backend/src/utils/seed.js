const User = require('../models/User');
const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const Bed = require('../models/Bed');
const logger = require('./logger');
const connectDB = require('../config/db');

async function seedData() {
  logger.info('Ensuring Owner and Warden accounts exist...');

  // Ensure Owner Account
  let owner = await User.findOne({ role: 'owner' });
  if (!owner) {
    owner = await User.create({
      name: 'adminculture',
      email: 'adminculture@hostelhub.com',
      phone: '9990001111',
      passwordHash: 'culhostel%7875',
      role: 'owner',
      status: 'active',
    });
  } else {
    owner.name = 'adminculture';
    owner.email = 'adminculture@hostelhub.com';
    owner.passwordHash = 'culhostel%7875';
    await owner.save();
  }

  // Ensure Hostel
  let hostel = await Hostel.findOne({ owner: owner._id });
  if (!hostel) {
    hostel = await Hostel.create({
      name: 'Primary Hostel Branch',
      owner: owner._id,
      address: { line1: 'Main Campus Road', city: 'City Center', state: 'State', pincode: '110001' },
      contactNumber: '9990001111',
      amenities: ['WiFi', 'Laundry', 'Mess', '24x7 Water'],
      genderPolicy: 'co-ed',
    });
    owner.ownedHostels = [hostel._id];
    await owner.save();
  }

  // Ensure Warden Account
  let warden = await User.findOne({ role: 'warden' });
  if (!warden) {
    warden = await User.create({
      name: 'wardenhostel',
      email: 'wardenhostel@hostelhub.com',
      phone: '9990002222',
      passwordHash: 'wargaurav%1981',
      role: 'warden',
      status: 'active',
      hostel: hostel._id,
    });
  } else {
    warden.name = 'wardenhostel';
    warden.email = 'wardenhostel@hostelhub.com';
    warden.passwordHash = 'wargaurav%1981';
    await warden.save();
  }

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
