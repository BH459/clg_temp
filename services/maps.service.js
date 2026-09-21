const axios = require("axios");

const API_KEY = process.env.MAPS_API;

module.exports.getSuggestions = async (input) => {

    const response = await axios.get(
        "https://api.geoapify.com/v1/geocode/autocomplete",
        {
            params: {
                text: input,
                limit: 5,
                filter: "countrycode:in",
                apiKey: API_KEY
            }
        }
    );

    return response.data.features.map(place => ({
        name: place.properties.formatted,
        lat: place.properties.lat,
        lng: place.properties.lon
    }));
};

module.exports.getAddressCoordinate = async (address) => {

    const response = await axios.get(
        "https://api.geoapify.com/v1/geocode/search",
        {
            params: {
                text: address,
                apiKey: API_KEY
            }
        }
    );

    if (!response.data.features.length) {
        throw new Error("Address not found");
    }

    const place = response.data.features[0];

    return {
        lat: place.properties.lat,
        lng: place.properties.lon
    };
};

module.exports.getDistanceTime = async (
    originLat,
    originLng,
    destLat,
    destLng
) => {

    try {


        const url =
            `https://api.geoapify.com/v1/routing` +
            `?waypoints=${originLat},${originLng}|${destLat},${destLng}` +
            `&mode=drive` +
            `&apiKey=${API_KEY}`;

        console.log("URL:", url);

        const response = await axios.get(url);

        

        const route =
            response.data.features[0].properties;

        const totalSeconds = route.time;

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);

        let duration = "";

        if (hours > 0) {
            duration = `${hours} hr ${minutes} min`;
        } else if (minutes > 0) {
            duration = `${minutes} min`;
        } else {
            duration = `${seconds} sec`;
        }

        return {
            distance:
                (route.distance / 1000).toFixed(2) + " km",

            distanceValue: route.distance,

            duration,

            durationValue: route.time
        };

    } catch (error) {

        

        throw new Error(
            error.response?.data?.message ||
            error.message
        );
    }
};

module.exports.getDistanceAndTime = async (
    originAddress,
    destinationAddress
) => {

    const origin =
        await module.exports.getAddressCoordinate(
            originAddress
        );

    const destination =
        await module.exports.getAddressCoordinate(
            destinationAddress
        );

    return await module.exports.getDistanceTime(
        origin.lat,
        origin.lng,
        destination.lat,
        destination.lng
    );
};