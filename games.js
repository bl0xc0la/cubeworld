const express = require("express");
const Game = require("../models/Game");
const Save = require("../models/Save");

const router = express.Router();

/* CREATE GAME */
router.post("/create", async (req,res)=>{

    const game = await Game.create(req.body);

    res.json(game);

});

/* GET GAMES */
router.get("/", async (req,res)=>{

    const games = await Game.find();

    res.json(games);

});

/* SAVE STUDIO DATA */
router.post("/save", async (req,res)=>{

    const save = await Save.findOneAndUpdate(
        { gameId: req.body.gameId },
        { data: req.body.data },
        { upsert:true }
    );

    res.json(save);

});

/* LOAD STUDIO DATA */
router.get("/save/:id", async (req,res)=>{

    const save = await Save.findOne({
        gameId:req.params.id
    });

    res.json(save);

});

module.exports = router;
