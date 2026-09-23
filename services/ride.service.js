const rideModel = require('../models/ride.model');
const userModel = require('../models/user.model');
const mapService = require('./maps.service');
const crypto = require('crypto');

module.exports.getFare = async (pickup, destination) => {
  if (!pickup || !destination) {
    throw new Error('Pickup and destination are required');
  }

  const routeData = await mapService.getDistanceAndTime(pickup, destination);

  const distance = Number(routeData.distanceValue);

  const duration = Number(routeData.durationValue);

  const distanceKm = distance / 1000;
  const durationMin = duration / 60;

  const fare = {
    // Auto
    auto: Math.round(30 + distanceKm * 8 + durationMin * 1),

    // Moto
    moto: Math.round(20 + distanceKm * 5 + durationMin * 0.5),

    // Car
    car: Math.round(50 + distanceKm * 12 + durationMin * 2),

    // Vehicle Towing (Crane)
    // NOTE: key renamed from "towing" -> "crane" so it matches the
    // Captain.vehicle.vehicleType / Ride.vehicleType enum exactly.
    // Otherwise fare[vehicleType] returns undefined for crane requests
    // and createRide throws "Invalid vehicle type".
    crane: Math.round(300 + distanceKm * 20 + durationMin * 5),
  };

  return {
    fare,
    distance,
    duration,
  };
};

module.exports.createRide = async ({
  userId,
  pickup,
  destination,
  vehicleType,
}) => {
  if (!userId || !pickup || !destination || !vehicleType) {
    throw new Error('All fields are required');
  }

  // BUG FIX: vehicleType coming from the client (or an older app build)
  // can arrive as "Auto", "Car ", "MOTO", etc. The fare table and the
  // Ride/Captain enums are all lowercase ('auto','moto','car','crane'),
  // so a raw, un-normalized lookup below silently returns undefined for
  // anything not already exact-lowercase and throws "Invalid vehicle
  // type" — which is what breaks the auto/moto/car/crane matching
  // upstream of the socket layer.
  vehicleType =
    typeof vehicleType === 'string'
      ? vehicleType.trim().toLowerCase()
      : vehicleType;

  const VALID_VEHICLE_TYPES = ['car', 'moto', 'auto', 'crane'];

  if (!VALID_VEHICLE_TYPES.includes(vehicleType)) {
    throw new Error('Invalid vehicle type');
  }

  const user = await userModel.findById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  const fareData = await module.exports.getFare(pickup, destination);

  const fare = fareData.fare[vehicleType];

  if (!fare) {
    throw new Error('Invalid vehicle type');
  }

  const pickupCoordinates = await mapService.getAddressCoordinate(pickup);

  const destinationCoordinates =
    await mapService.getAddressCoordinate(destination);

  const otp = module.exports.generateOtp(6);

  const ride = await rideModel.create({
    user: userId,
    captain: null,

    pickup,
    destination,

    // BUG FIX: vehicleType was computed/validated above but never
    // actually written to the document, which is why Mongoose threw
    // "Path `vehicleType` is required." on every createRide call.
    vehicleType,

    pickupCoordinates: {
      lat: pickupCoordinates.lat,
      lng: pickupCoordinates.lng,
    },

    destinationCoordinates: {
      lat: destinationCoordinates.lat,
      lng: destinationCoordinates.lng,
    },

    fare,

    distance: fareData.distance,
    duration: fareData.duration,

    otp,

    status: 'pending',

    paymentId: null,
    orderId: null,
    signature: null,
  });

  const populatedRide = await rideModel.findById(ride._id).populate({
    path: 'user',
    select: '-password',
  });

  return {
    ride: populatedRide,
    otp,
  };
};

module.exports.generateOtp = (num = 6) => {
  const min = Math.pow(10, num - 1);
  const max = Math.pow(10, num) - 1;

  return crypto.randomInt(min, max + 1).toString();
};
