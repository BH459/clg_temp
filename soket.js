const { Server } = require('socket.io');
const User = require('./models/user.model');
const Captain = require('./models/captain.model');
const Ride = require('./models/ride.model');
const mapService = require('./services/maps.service');

let io;

const MAX_DISTANCE_KM = 30;

// Single source of truth for valid vehicle types — must stay in sync with
// the enum in Captain.vehicle.vehicleType and Ride.vehicleType.
const VALID_VEHICLE_TYPES = ['car', 'moto', 'auto', 'crane'];

function normalizeVehicleType(vehicleType) {
  if (!vehicleType || typeof vehicleType !== 'string') {
    return null;
  }

  const normalized = vehicleType.trim().toLowerCase();

  return VALID_VEHICLE_TYPES.includes(normalized) ? normalized : null;
}

function calculateDistanceInKm(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function initializeSoket(server) {
  if (io) {
    return io;
  }

  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    socket.on('join', async ({ userId, userType }) => {
      try {
        if (!userId || !userType) {
          return;
        }

        if (userType === 'user') {
          await User.findByIdAndUpdate(userId, { socketId: socket.id });
        } else if (userType === 'captain') {
          await Captain.findByIdAndUpdate(userId, { socketId: socket.id });
        }

        socket.join(userId.toString());
      } catch (error) {
        console.error('Error saving socket id:', error.message);
      }
    });

    socket.on('update-location', async ({ userId, userType, location }) => {
      try {
        if (!userId || !userType || !location) {
          return;
        }

        if (userType === 'captain') {
          await Captain.findByIdAndUpdate(
            userId,
            {
              socketId: socket.id,
              location,
              status: 'active',
            },
            { new: true }
          );
        }
      } catch (error) {
        console.error('Error updating captain location:', error.message);
      }
    });

    socket.on('leave', async ({ userId, userType }) => {
      try {
        if (!userId || !userType) {
          return;
        }

        if (userType === 'user') {
          await User.findByIdAndUpdate(userId, { socketId: null });
        } else if (userType === 'captain') {
          await Captain.findByIdAndUpdate(userId, { socketId: null });
        }

        socket.leave(userId.toString());
      } catch (error) {
        console.error('Error removing socket id:', error.message);
      }
    });

    socket.on('sendMessage', ({ eventName, data }) => {
      if (!eventName) {
        return;
      }

      socket.broadcast.emit(eventName, data);
    });

    socket.on('sendToUser', ({ userId, eventName, data }) => {
      if (!userId || !eventName) {
        return;
      }

      io.to(userId.toString()).emit(eventName, data);
    });

    // ===============================================================
    // RIDE REQUEST
    // Only broadcasts to captains whose vehicle.vehicleType matches
    // the ride's requested vehicleType (car -> car, auto -> auto,
    // moto -> moto, crane -> crane). Captains must also be 'active'
    // (i.e. online) and have a live socketId.
    // ===============================================================
    socket.on('ride-request', async ({ ride, otp }) => {
      try {
        if (!ride?.pickup || !ride?._id) {
          console.error('ride-request rejected: missing pickup or ride id', {
            rideId: ride?._id,
          });
          return;
        }

        const requestedVehicleType = normalizeVehicleType(ride.vehicleType);

        if (!requestedVehicleType) {
          console.error('ride-request rejected: invalid/missing vehicleType', {
            rideId: ride._id,
            receivedVehicleType: ride.vehicleType,
          });
          return;
        }

        const pickupCoordinates = await mapService.getAddressCoordinate(
          ride.pickup
        );

        // Only pull online captains driving the matching vehicle type.
        // This is the key fix: filtering happens at the query level so
        // a moto captain never even gets considered for a car ride.
        const captains = await Captain.find({
          status: 'active',
          'vehicle.vehicleType': requestedVehicleType,
        });

        console.log(
          `ride-request [${ride._id}] wants "${requestedVehicleType}" — ${captains.length} online captain(s) with matching vehicle type found`
        );

        let notifiedCount = 0;

        for (const captain of captains) {
          const captainVehicleType = normalizeVehicleType(
            captain.vehicle?.vehicleType
          );

          if (!captain.socketId) {
            continue;
          }

          if (captain.location?.lat == null || captain.location?.lng == null) {
            continue;
          }

          // Defensive re-check even though the query already filtered on
          // vehicle.vehicleType, in case of stale/mixed-case data.
          if (captainVehicleType !== requestedVehicleType) {
            console.log(
              `  skip captain ${captain._id}: vehicleType mismatch (captain="${captain.vehicle?.vehicleType}", requested="${requestedVehicleType}")`
            );
            continue;
          }

          const distance = calculateDistanceInKm(
            captain.location.lat,
            captain.location.lng,
            pickupCoordinates.lat,
            pickupCoordinates.lng
          );

          console.log(
            `  captain ${captain._id} (${captainVehicleType}) distance=${distance.toFixed(
              2
            )}km`
          );

          if (distance <= MAX_DISTANCE_KM) {
            io.to(captain.socketId).emit('new-ride-request', {
              ride: {
                ...ride,
                vehicleType: requestedVehicleType,
                otp: otp || ride.otp,
              },
              pickupCoordinates,
              distance,
            });

            notifiedCount += 1;
          }
        }

        console.log(
          `ride-request [${ride._id}] notified ${notifiedCount} captain(s) within ${MAX_DISTANCE_KM}km`
        );
      } catch (error) {
        console.error('Error handling ride request:', error.message);
      }
    });

    socket.on('ride-accepted', async ({ rideId, userId, captainId }) => {
      try {
        if (!rideId || !userId || !captainId) {
          return;
        }

        const ride = await Ride.findById(rideId)
          .select('+otp')
          .populate('user')
          .populate('captain');

        if (!ride) {
          console.error('ride-accepted: ride not found', { rideId });
          return;
        }

        const captain = await Captain.findById(captainId);

        // Guard against a captain accepting a ride whose vehicleType they
        // don't actually drive (e.g. a stale client, or two captains
        // racing to accept at once).
        const rideVehicleType = normalizeVehicleType(ride.vehicleType);
        const captainVehicleType = normalizeVehicleType(
          captain?.vehicle?.vehicleType
        );

        if (
          rideVehicleType &&
          captainVehicleType &&
          rideVehicleType !== captainVehicleType
        ) {
          console.error(
            `ride-accepted rejected: vehicleType mismatch (ride="${rideVehicleType}", captain="${captainVehicleType}")`,
            { rideId, captainId }
          );
          return;
        }

        const updatedRide = await Ride.findByIdAndUpdate(
          rideId,
          {
            captain: captainId,
            status: 'accepted',
          },
          { new: true }
        )
          .select('+otp')
          .populate('user')
          .populate('captain');

        const payload = {
          ride: updatedRide,
          otp: updatedRide?.otp || ride?.otp || '',
        };

        const user = await User.findById(userId);

        if (user?.socketId) {
          io.to(user.socketId).emit('ride-accepted', payload);
        } else {
          console.log('ride-accepted: user has no active socketId', {
            userId,
          });
        }
      } catch (error) {
        console.error('Error accepting ride:', error.message);
      }
    });

    socket.on('ride-started', async ({ rideId }) => {
      try {
        const ride = await Ride.findByIdAndUpdate(
          rideId,
          {
            status: 'ongoing',
          },
          {
            new: true,
          }
        )
          .populate('user')
          .populate('captain');

        if (!ride) {
          console.error('ride-started: ride not found', { rideId });
          return;
        }

        if (ride.user?.socketId) {
          io.to(ride.user.socketId).emit('ride-started', { ride });
        }

        if (ride.captain?.socketId) {
          io.to(ride.captain.socketId).emit('ride-started', { ride });
        }
      } catch (error) {
        console.error('Ride Started Error:', error.message);
      }
    });

    socket.on('disconnect', async () => {
      try {
        await User.findOneAndUpdate(
          { socketId: socket.id },
          { socketId: null }
        );
        await Captain.findOneAndUpdate(
          { socketId: socket.id },
          { socketId: null }
        );
      } catch (error) {
        console.error('Error clearing socket id:', error.message);
      }
    });
  });

  return io;
}

function sendMessageToSocketid(socketId, event, data) {
  if (!io || !socketId || !event) {
    return false;
  }

  io.to(socketId).emit(event, data);
  return true;
}

module.exports = {
  initializeSoket,
  sendMessageToSocketid,
};
