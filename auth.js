const express = require("express");
const User = require("../models/User");

const router = express.Router();

/* REGISTER */
router.post("/register", async (req,res)=>{

    const user = await User.create(req.body);

    res.json(user);

});

/* LOGIN */
router.post("/login", async (req,res)=>{

    const user = await User.findOne(req.body);

    if(!user) return res.json({ success:false });

    res.json({ success:true, user });

});

module.exports = router;
