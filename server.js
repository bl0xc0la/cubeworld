// --- ADD THESE TO YOUR EXISTING SERVER.JS ---

// Store games in memory or MongoDB
const Game = mongoose.model('Game', new mongoose.Schema({
    name: String,
    creator: String,
    parts: Array,
    createdAt: { type: Date, default: Date.now }
}));

// Fix 404: Daily Claim Route
app.post('/api/daily-claim', async (req, res) => {
    const { username } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).send("User not found");
    
    // Add 50 CubeBucks
    user.cubebucks = (user.cubebucks || 0) + 50;
    await user.save();
    res.json({ balance: user.cubebucks });
});

// Fix: Get All Games
app.get('/api/games', async (req, res) => {
    const games = await Game.find().sort({ createdAt: -1 });
    res.json(games);
});

// Fix: Get Single Game
app.get('/api/games/:id', async (req, res) => {
    const game = await Game.findById(req.params.id);
    res.json(game);
});

// Fix: Socket.io Publish Logic
io.on('connection', (socket) => {
    socket.on('publish-game', async (data) => {
        const newGame = await Game.create(data);
        const allGames = await Game.find();
        io.emit('sync-games', allGames); // Update everyone's list
    });
});
