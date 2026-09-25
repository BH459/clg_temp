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

// const rideModel = require('../models/ride.model');
// const userModel = require('../models/user.model');
// const captainModel = require('../models/captain.model');
// const mapService = require('./maps.service');
// const crypto = require('crypto');

// // ======================================================
// // RATE CARD
// // base    — flat cost for accepting the ride
// // perKm   — covers fuel/wear, charged per km of the route
// // perMin  — covers driver's time (traffic/waiting), charged per min
// // minFare — floor so a very short/cheap ride still pays a living amount
// // ======================================================
// const RATE_CARD = {
//   auto: { base: 25, perKm: 8, perMin: 1, minFare: 40 },
//   moto: { base: 15, perKm: 6, perMin: 0.5, minFare: 25 },
//   car: { base: 40, perKm: 13, perMin: 1.5, minFare: 70 },
//   crane: { base: 250, perKm: 28, perMin: 4, minFare: 350 },
// };

// // Flat platform charge added AFTER surge (Uber calls this the "Booking
// // Fee") — covers payment processing / support and stays constant
// // regardless of demand, so it isn't multiplied by the surge factor.
// const BOOKING_FEE = 6;

// // Surge multiplier tiers, same shape Uber/Ola use: the ratio of nearby
// // pending requests to nearby available captains decides which tier
// // applies. Capped at 2.5x so pricing never runs away unboundedly.
// const SURGE_TIERS = [
//   { maxRatio: 1, multiplier: 1.0 },
//   { maxRatio: 2, multiplier: 1.2 },
//   { maxRatio: 3, multiplier: 1.5 },
//   { maxRatio: 5, multiplier: 1.8 },
//   { maxRatio: Infinity, multiplier: 2.5 },
// ];

// // Radius (km) within which nearby demand/supply is measured for surge.
// const SURGE_RADIUS_KM = 5;

// // ======================================================
// // Haversine distance between two lat/lng points, in km.
// // Captain/ride locations are stored as plain lat/lng numbers (not
// // GeoJSON), so this replaces a Mongo $near geospatial query for the
// // project's current schema.
// // ======================================================
// const haversineKm = (lat1, lng1, lat2, lng2) => {
//   const toRad = (deg) => (deg * Math.PI) / 180;
//   const R = 6371; // Earth radius in km

//   const dLat = toRad(lat2 - lat1);
//   const dLng = toRad(lng2 - lng1);

//   const a =
//     Math.sin(dLat / 2) ** 2 +
//     Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

//   return R * 2 * Math.asin(Math.sqrt(a));
// };

// // ======================================================
// // SURGE MULTIPLIER
// // Counts online captains of this vehicle type within SURGE_RADIUS_KM
// // of the pickup point, and pending ride requests of the same type in
// // the same radius, then maps demand/supply ratio to a surge tier.
// // ======================================================
// const calculateSurgeMultiplier = async (pickupCoordinates, vehicleType) => {
//   const { lat, lng } = pickupCoordinates;

//   const [onlineCaptains, pendingRides] = await Promise.all([
//     captainModel
//       .find({
//         status: 'active',
//         'vehicle.vehicleType': vehicleType,
//         'location.lat': { $ne: null },
//         'location.lng': { $ne: null },
//       })
//       .select('location'),

//     rideModel
//       .find({
//         status: 'pending',
//         vehicleType,
//       })
//       .select('pickupCoordinates'),
//   ]);

//   const nearbyCaptains = onlineCaptains.filter(
//     (captain) =>
//       haversineKm(lat, lng, captain.location.lat, captain.location.lng) <=
//       SURGE_RADIUS_KM
//   ).length;

//   const nearbyDemand = pendingRides.filter(
//     (ride) =>
//       ride.pickupCoordinates?.lat != null &&
//       haversineKm(
//         lat,
//         lng,
//         ride.pickupCoordinates.lat,
//         ride.pickupCoordinates.lng
//       ) <= SURGE_RADIUS_KM
//   ).length;

//   // No captains nearby at all and there IS demand: treat as the
//   // highest tier rather than dividing by zero.
//   const ratio =
//     nearbyCaptains === 0
//       ? nearbyDemand > 0
//         ? Infinity
//         : 0
//       : nearbyDemand / nearbyCaptains;

//   const tier = SURGE_TIERS.find((t) => ratio <= t.maxRatio);

//   return {
//     multiplier: tier.multiplier,
//     nearbyCaptains,
//     nearbyDemand,
//     ratio: Number.isFinite(ratio) ? Number(ratio.toFixed(2)) : ratio,
//   };
// };

// // ======================================================
// // FARE FOR ONE VEHICLE TYPE
// // subtotal = base + distanceKm*perKm + durationMin*perMin
// // surged   = subtotal * surgeMultiplier
// // total    = max(surged, minFare) + BOOKING_FEE
// // ======================================================
// const buildFare = (rate, distanceKm, durationMin, surgeMultiplier) => {
//   const baseFare = rate.base;
//   const distanceFare = distanceKm * rate.perKm;
//   const timeFare = durationMin * rate.perMin;

//   const subtotal = baseFare + distanceFare + timeFare;
//   const surged = subtotal * surgeMultiplier;

//   const total = Math.round(Math.max(surged, rate.minFare) + BOOKING_FEE);

//   return {
//     baseFare: Math.round(baseFare),
//     distanceFare: Math.round(distanceFare),
//     timeFare: Math.round(timeFare),
//     subtotal: Math.round(subtotal),
//     surgeMultiplier,
//     bookingFee: BOOKING_FEE,
//     totalFare: total,
//   };
// };

// // ======================================================
// // getFare
// // Needs pickup coordinates (for surge lookup) before pricing, so
// // geocoding now happens here instead of only in createRide — the
// // coordinates are returned too, so createRide doesn't geocode twice.
// // ======================================================
// module.exports.getFare = async (pickup, destination, vehicleType = null) => {
//   if (!pickup || !destination) {
//     throw new Error('Pickup and destination are required');
//   }

//   const [pickupCoordinates, destinationCoordinates] = await Promise.all([
//     mapService.getAddressCoordinate(pickup),
//     mapService.getAddressCoordinate(destination),
//   ]);

//   const routeData = await mapService.getDistanceTime(
//     pickupCoordinates.lat,
//     pickupCoordinates.lng,
//     destinationCoordinates.lat,
//     destinationCoordinates.lng
//   );

//   const distance = Number(routeData.distanceValue);
//   const duration = Number(routeData.durationValue);

//   const distanceKm = distance / 1000;
//   const durationMin = duration / 60;

//   const vehicleTypes = vehicleType ? [vehicleType] : Object.keys(RATE_CARD);

//   const fare = {};
//   const fareBreakdown = {};

//   for (const type of vehicleTypes) {
//     const rate = RATE_CARD[type];
//     if (!rate) continue;

//     const surge = await calculateSurgeMultiplier(pickupCoordinates, type);
//     const breakdown = buildFare(
//       rate,
//       distanceKm,
//       durationMin,
//       surge.multiplier
//     );

//     fare[type] = breakdown.totalFare;
//     fareBreakdown[type] = { ...breakdown, surgeInfo: surge };
//   }

//   return {
//     fare,
//     fareBreakdown,
//     distance,
//     duration,
//     pickupCoordinates,
//     destinationCoordinates,
//   };
// };

// module.exports.createRide = async ({
//   userId,
//   pickup,
//   destination,
//   vehicleType,
// }) => {
//   if (!userId || !pickup || !destination || !vehicleType) {
//     throw new Error('All fields are required');
//   }

//   // vehicleType can arrive as "Auto", "Car ", "MOTO", etc. The rate
//   // card and Ride/Captain enums are all lowercase, so normalize here.
//   vehicleType =
//     typeof vehicleType === 'string'
//       ? vehicleType.trim().toLowerCase()
//       : vehicleType;

//   const VALID_VEHICLE_TYPES = ['car', 'moto', 'auto', 'crane'];

//   if (!VALID_VEHICLE_TYPES.includes(vehicleType)) {
//     throw new Error('Invalid vehicle type');
//   }

//   const user = await userModel.findById(userId);

//   if (!user) {
//     throw new Error('User not found');
//   }

//   // Only price the requested vehicle type — skips computing surge for
//   // the other three unnecessarily.
//   const fareData = await module.exports.getFare(
//     pickup,
//     destination,
//     vehicleType
//   );

//   const fare = fareData.fare[vehicleType];

//   if (!fare) {
//     throw new Error('Invalid vehicle type');
//   }

//   const otp = module.exports.generateOtp(6);

//   const ride = await rideModel.create({
//     user: userId,
//     captain: null,

//     pickup,
//     destination,

//     vehicleType,

//     pickupCoordinates: {
//       lat: fareData.pickupCoordinates.lat,
//       lng: fareData.pickupCoordinates.lng,
//     },

//     destinationCoordinates: {
//       lat: fareData.destinationCoordinates.lat,
//       lng: fareData.destinationCoordinates.lng,
//     },

//     fare,

//     distance: fareData.distance,
//     duration: fareData.duration,

//     otp,

//     status: 'pending',

//     paymentId: null,
//     orderId: null,
//     signature: null,
//   });

//   const populatedRide = await rideModel.findById(ride._id).populate({
//     path: 'user',
//     select: '-password',
//   });

//   return {
//     ride: populatedRide,
//     otp,
//   };
// };

// module.exports.generateOtp = (num = 6) => {
//   const min = Math.pow(10, num - 1);
//   const max = Math.pow(10, num) - 1;

//   return crypto.randomInt(min, max + 1).toString();
// };
