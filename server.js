const http = require("http");
const app = require("./app");
const { initializeSoket } = require("./soket");
const port = process.env.PORT || 3000;

const server = http.createServer(app);

initializeSoket(server);

server.listen(port, () => {
    console.log(`server is running in port ${port}`);
});