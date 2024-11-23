
const socketIO = require("socket.io");
const { studentQuestionList } = require("../Utils/helpers");

let io; // This will store the Socket.IO instance

function init(server) {
    io = socketIO(server, {
        cors: {
            origin: "http://localhost:3000",
            methods: ["GET", "POST"],
            credentials: true,
        },
        maxHttpBufferSize: 1e8, // Set to a buffer value
    });
    io.listen(4000);

    // socket connection
    io.on("connection", (socket) => {
        socket.on("standardId", async ({ data }) => {
            let questionsData = await studentQuestionList({ data });
            io.emit("sendQuestionList", questionsData);
        });

        socket.on("disconnect", (reason) => {
            return;
        });
    });
}

function getIO() {
    if (!io) {
        throw new Error("Socket.IO not initialized");
    }
    return io;
}

module.exports = {
    init,
    getIO,
};

