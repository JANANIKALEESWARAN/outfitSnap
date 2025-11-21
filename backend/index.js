const port= process.env.PORT || 4000;
const express=require("express");
const app=express();
const mongoose=require("mongoose");
const jwt=require("jsonwebtoken");
const multer=require("multer");
const path=require("path");
const cors=require("cors");
const { type } = require("os");

app.use(express.json());
app.use(cors());

//database connection with mongodb
//mongoose.connect("mongodb+srv://janani:abc12def@cluster0.ztkcrhl.mongodb.net/outfit_snap")
mongoose.connect(
  "mongodb+srv://janani:abc12def@cluster0.ztkcrhl.mongodb.net/outfit_snap?retryWrites=true&w=majority&appName=Cluster0",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    family: 4 // forces IPv4 (fixes Windows + Node 22 DNS issue)
  }
)
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ MongoDB connection error:", err));


//API Creation
app.get("/",(req,res)=>{
    res.send("Express App is Running");
})

//image storage
const storage=multer.diskStorage({
    destination:'./upload/images',
    filename:(req,file,cb)=>{
        return cb(null,`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})


const upload=multer({storage:storage})

//creating upload  endpoint for image
app.use('/images',express.static('upload/images'))
app.post("/upload",upload.single('product'),(req,res)=>{
    res.json({
        success:1,
        image_url:`http://localhost:${port}/images/${req.file.filename}`
    })
})

//Schema for creating products
const Product=mongoose.model("Product",{
    id:{
        type:Number,
        required:true,
    },
    name:{
        type:String,
        required:true,
    },
    image:{
        type:String,
        required:true,
    },
    category:{
        type:String,
        required:true,
    },
    new_price:{
        type:Number,
        required:true,
    },
    old_price:{
        type:Number,
        required:true,
    },
    date:{
        type:Date,
        default:Date.now,
    },
    available:{
        type:Boolean,
        default:true,
    },
})
const fetchAdmin = async (req, res, next) => {
  const token = req.header("admin-auth-token");
  if (!token) {
    return res.status(401).send({ error: "Please authenticate as Admin" });
  }
  try {
    const data = jwt.verify(token, "secret_admin");
    req.admin = data.admin;
    next();
  } catch (error) {
    res.status(401).send({ error: "Invalid Token" });
  }
};
app.post('/addproduct',async(req,res)=>{
    let products=await Product.find({});
    let id;
    if(products.length>0){
        let last_product_array=products.slice(-1);
        let last_product=last_product_array[0];
        id=last_product.id+1;
    }
    else{
        id=1;
    }
    const product=new Product({
        id:id,
        name:req.body.name,
        image:req.body.image,
        category:req.body.category,
        new_price:req.body.new_price,
        old_price:req.body.old_price,
    });
    console.log(product);
    await product.save();
    console.log("saved");
    res.json({
        success:true,
        name:req.body.name,
    })
})

//creating API for deleting item
app.post('/removeproduct',async(req,res)=>{
    await Product.findOneAndDelete({id:req.body.id});
    console.log("Removed");
    res.json({
        success:true,
        name:req.body.name,
    })
})

//creating Api for getting all products
app.get('/allproducts',async(req,res)=>{
    let products=await Product.find({});
    console.log("All Products Fetched");
    res.send(products);
})

//schema creating for user model
const Users=mongoose.model('Users',{
    name:{
        type:String,
    },
    email:{
        type:String,
        unique:true,
    },
    password:{
        type:String,
    },
    cartData:{
        type:Object,
    },
    date:{
        type:Date,
        default:Date.now,
    }
})

//creating endpoint for registering the user
app.post('/signup',async(req,res)=>{
    let check=await Users.findOne({email:req.body.email});
    if(check){
        return res.status(400).json({success:false,errors:"Existing User Found with same email id or email address"})
    }
    let cart={};
    for(let i=0;i<300;i++){
        cart[i]=0;
    }
    const user=new Users({
        name:req.body.username,
        email:req.body.email,
        password:req.body.password,
        cartData:cart,
    })
    await user.save();
    //jwt token
    const data={
        user:{
            id:user.id
        }
    }

    const token=jwt.sign(data,'secret_ecom');
    res.json({success:true,token})

})

//creating endpoint for user login
app.post('/login',async(req,res)=>{
    let user=await Users.findOne({email:req.body.email});
    if(user){
        const passCompare=req.body.password===user.password;
        if(passCompare){
            const data={
                user:{
                    id:user.id
                }
            }
            const token=jwt.sign(data,'secret_ecom');
            res.json({success:true,token});
        }
        else{
            res.json({success:false,errors:"Wrong Password"});
        }
    }
    else{
        res.json({success:false,errors:"Wrong email id"});
    }
})

//creating endpoint for new collection data

app.get('/newcollections',async(req,res)=>{
    let products=await Product.find({});
    let newcollection=products.slice(1).slice(-8);
    console.log("NewCollection fetched");
    res.send(newcollection);
})

//creating endpoint for popular in women section
app.get('/popularinwomen',async(req,res)=>{
    let products=await Product.find({category:"women"});
    let popular_in_women=products.slice(0,4);
    console.log("Popular in women fetched");
    res.send(popular_in_women);
})

//creating middleware to fetch user

const fetchUser=async(req,res,next)=>{
    const token=req.header('auth-token');
    if(!token){
        res.status(401).send({errors:"Please authenticate using Valid Token"})
    }
    else{
        try{
            const data=jwt.verify(token,'secret_ecom');
            req.user=data.user;
            next();
        }catch(error){
            res.status(401).send({errors:"please authenticate using Valid Token"})
        }
    }
}

//creating endpoint for adding products in cartdata
app.post('/addtocart',fetchUser,async(req,res)=>{
    console.log("Added",req.body.itemId);
    let userData=await Users.findOne({_id:req.user.id});
    userData.cartData[req.body.itemId]+=1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Added")
})

// creating endpoint to remove product from cartdata
app.post('/removefromcart',fetchUser,async(req,res)=>{
    console.log("removed",req.body.itemId);
     let userData=await Users.findOne({_id:req.user.id});
     if(userData.cartData[req.body.itemId]>0)
    userData.cartData[req.body.itemId]-=1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Removed")
})


//creating endpoint to get cartData
app.post('/getcart',fetchUser,async(req,res)=>{
    console.log("GetCart");
    let userData=await Users.findOne({_id:req.user.id});
    res.json(userData.cartData);
})


// schema creating for admin model
const Admin = mongoose.model("Admin", {
  email: {
    type: String,
    unique: true,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

// Admin signup (only needed once to create an admin account)
app.post("/adminsignup", async (req, res) => {
  try {
    let check = await Admin.findOne({ email: req.body.email });
    if (check) {
      return res.status(400).json({ success: false, error: "Admin already exists" });
    }

    const admin = new Admin({
      email: req.body.email,
      password: req.body.password, // ❌ plain for now (can upgrade to bcrypt)
    });

    await admin.save();

    const data = { admin: { id: admin.id } };
    const token = jwt.sign(data, "secret_admin");
    res.json({ success: true, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});
//creating adminlogin
app.post("/adminlogin", async (req, res) => {
  try {
    let admin = await Admin.findOne({ email: req.body.email });
    if (admin) {
      const passCompare = req.body.password === admin.password;
      if (passCompare) {
        const data = { admin: { id: admin.id } };
        const token = jwt.sign(data, "secret_admin");
        res.json({ success: true, token });
      } else {
        res.json({ success: false, error: "Wrong Password" });
      }
    } else {
      res.json({ success: false, error: "Admin not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});




app.listen(port,(error)=>{
    if(!error){
        console.log("Server is running on port: "+port);
    }
    else{
        console.log("Error:"+error);
    }
})