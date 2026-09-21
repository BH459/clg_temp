const { Server } = require("socket.io");
const User = require("./models/user.model");
const Captain = require("./models/captain.model");
const Ride = require("./models/ride.model");
const mapService = require("./services/maps.service");

let io;

const MAX_DISTANCE_KM = 30;

function calculateDistanceInKm(lat1, lon1, lat2, lon2) {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

function initializeSoket(server) {
    if (io) {
        return io;
    }

    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        socket.on("join", async ({ userId, userType }) => {
            try {
                if (!userId || !userType) {
                    return;
                }

                if (userType === "user") {
                    await User.findByIdAndUpdate(userId, { socketId: socket.id });
                } else if (userType === "captain") {
                    await Captain.findByIdAndUpdate(userId, { socketId: socket.id });
                }

                socket.join(userId.toString());
            } catch (error) {
                console.error("Error saving socket id:", error.message);
            }
        });

        socket.on("update-location", async ({ userId, userType, location }) => {
            try {
                if (!userId || !userType || !location) {
                    return;
                }

                if (userType === "captain") {
                    await Captain.findByIdAndUpdate(
                        userId,
                        {
                            socketId: socket.id,
                            location,
                            status: "active"
                        },
                        { new: true }
                    );
                }
            } catch (error) {
                console.error("Error updating captain location:", error.message);
            }
        });

        socket.on("leave", async ({ userId, userType }) => {
            try {
                if (!userId || !userType) {
                    return;
                }

                if (userType === "user") {
                    await User.findByIdAndUpdate(userId, { socketId: null });
                } else if (userType === "captain") {
                    await Captain.findByIdAndUpdate(userId, { socketId: null });
                }

                socket.leave(userId.toString());
            } catch (error) {
                console.error("Error removing socket id:", error.message);
            }
        });

        socket.on("sendMessage", ({ eventName, data }) => {
            if (!eventName) {
                return;
            }

            socket.broadcast.emit(eventName, data);
        });

        socket.on("sendToUser", ({ userId, eventName, data }) => {
            if (!userId || !eventName) {
                return;
            }

            io.to(userId.toString()).emit(eventName, data);
        });

        socket.on("ride-request", async ({ ride, otp }) => {
            try {
                if (!ride?.pickup || !ride?._id) {
                    return;
                }

                const pickupCoordinates = await mapService.getAddressCoordinate(ride.pickup);
                const captains = await Captain.find({ status: "active" });

                for (const captain of captains) {
                    if (
                        captain.location?.lat == null ||
                        captain.location?.lng == null ||
                        !captain.socketId
                    ) {
                        continue;
                    }

                    const distance = calculateDistanceInKm(
                        captain.location.lat,
                        captain.location.lng,
                        pickupCoordinates.lat,
                        pickupCoordinates.lng
                    );

                    if (distance <= MAX_DISTANCE_KM) {
                        io.to(captain.socketId).emit("new-ride-request", {
                            ride: {
                                ...ride,
                                otp: otp || ride.otp
                            },
                            pickupCoordinates,
                            distance
                        });
                    }
                }
            } catch (error) {
                console.error("Error handling ride request:", error.message);
            }
        });

        socket.on("ride-accepted", async ({ rideId, userId, captainId }) => {

    console.log("========== RIDE ACCEPTED ==========");
    console.log({
        rideId,
        userId,
        captainId
    });

    try {

        if (!rideId || !userId || !captainId) {
            console.log("Missing rideId, userId or captainId");
            return;
        }

        const ride = await Ride.findById(rideId)
            .select("+otp")
            .populate("user")
            .populate("captain");

        if (!ride) {
            console.log("Ride not found");
            return;
        }

        const updatedRide = await Ride.findByIdAndUpdate(
            rideId,
            {
                captain: captainId,
                status: "accepted"
            },
            { new: true }
        )
            .select("+otp")
            .populate("user")
            .populate("captain");

        const payload = {
            ride: updatedRide,
            otp: updatedRide?.otp || ride?.otp || ""
        };

        console.log("Sending ride accepted event");
        console.log(payload);

        const user = await User.findById(userId);

        if (user?.socketId) {

    console.log(
        "Sending accepted ride to user socket:",
        user.socketId
    );

    io.to(user.socketId).emit(
        "ride-accepted",
        payload
    );
}else {
            console.log("User socket not found");
        }

    } catch (error) {

        console.error(
            "Error accepting ride:",
            error.message
        );

    }
});
socket.on("ride-started", async ({ rideId }) => {

    try {

        console.log("========== RIDE STARTED ==========");

        const ride = await Ride.findByIdAndUpdate(
            rideId,
            {
                status: "ongoing"
            },
            {
                new: true
            }
        )
        .populate("user")
        .populate("captain");

        if (!ride) {
            console.log("Ride not found");
            return;
        }

        console.log(
            "User Socket:",
            ride.user?.socketId
        );

        console.log(
            "Captain Socket:",
            ride.captain?.socketId
        );

        if (ride.user?.socketId) {

            io.to(
                ride.user.socketId
            ).emit(
                "ride-started",
                {
                    ride
                }
            );

            console.log(
                "ride-started sent to user"
            );
        }

        if (ride.captain?.socketId) {

            io.to(
                ride.captain.socketId
            ).emit(
                "ride-started",
                {
                    ride
                }
            );

            console.log(
                "ride-started sent to captain"
            );
        }

    } catch (error) {

        console.log(
            "Ride Started Error:",
            error.message
        );

    }

});
        socket.on("disconnect", async () => {
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
                console.error("Error clearing socket id:", error.message);
            }

            console.log(`Socket disconnected: ${socket.id}`);
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
    sendMessageToSocketid
};
