module.exports = function(io){

    io.on("connection",(socket)=>{

        socket.on("join",(gameId)=>{
            socket.join(gameId);
        });

        socket.on("updateObject",(data)=>{
            io.to(data.gameId).emit("updateObject",data);
        });

        socket.on("playerMove",(data)=>{
            io.to(data.gameId).emit("playerMove",data);
        });

        socket.on("disconnect",()=>{});

    });

};
