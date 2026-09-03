const express=require('express');
const router=express.Router();
const Listing=require('../models/Listing');
const auth=require('../middleware/auth');

// @route   POST /api/listings
router.post('/',auth,async(req,res)=>{
    try{
        const {material,quantity,price,location,description}=req.body;
        const user = await User.findById(req.userId);
        const listing=new Listing({
            generaterId:req.userId,
            generatorName:user.name,
            material,quantity,price,location,description
        });
        await listing.save();
        res.status(201).json(listing);
    }catch(err){
        res.status(500).json({msg:err.message});
    }
});

// @route   GET /api/listings
router.get('/', async (req, res) => {
  try {
    const listings = await Listing.find({ status: 'active' });
    res.json(listings);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// @route   GET /api/listings/user
router.get('/user', auth, async (req, res) => {
  try {
    const listings = await Listing.find({ generatorId: req.userId });
    res.json(listings);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});


// @route   PUT /api/listings/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const listing = await Listing.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(listing);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;