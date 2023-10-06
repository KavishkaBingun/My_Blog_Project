const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require ('./models/User');
const Post = require('./models/Post');
var bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
const multer = require('multer');
const uploadMiddleWare = multer({ dest: 'uploads/' })
const fs = require('fs');
const { dirname } = require('path');

const salt = bcrypt.genSaltSync(10);
const secret = 'vfdv52bg33bfs1nhn532dvs5fbd2r5';

app.use(cors({credentials:true,origin:'http://localhost:3000'}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads',express.static(__dirname + '/uploads'));


mongoose.connect('mongodb+srv://blog:kavi2014blog@cluster0.ag8coqv.mongodb.net/blogdb?retryWrites=true&w=majority');

app.post('/register',async (req , res) => {
    const {username, password} = req.body;

    try{
        const UserDoc = await User.create({
            username,
            password : bcrypt.hashSync(password,salt),
        });
        res.json(UserDoc);

    }catch(e){
        console.log(e);

        res.status(400).json(e);
    }
});

app.post('/login',async (req,res)=>{
    const {username , password} = req.body;
    const UserDoc = await User.findOne({username})
    const passOk = bcrypt.compareSync(password, UserDoc.password);
    if(passOk){
        jwt.sign({username,id:UserDoc._id},secret,{},(err,token) => {

            if (err) throw err;
            res.cookie('token',token).json({
                id:UserDoc._id,
                username,
            });

        })
    }else{
        res.status(400).json('Wrong Credentials');
    }
})

app.get('/profile',(req,res) => {
    const {token} = req.cookies;
    jwt.verify(token,secret,{},(err,info)=>{

        if(err) throw err;
        res.json(info);


    })
    
})

app.post('/logout',(req,res) => {
    res.cookie('token','').json('ok');
})

app.post('/post', uploadMiddleWare.single('file') ,async (req,res) => {
    const {originalname,path} = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    const newPath = path+'.'+ext;
    fs.renameSync(path,newPath);
    const {token} = req.cookies;
    jwt.verify(token,secret,{},async (err,info)=>{

        if(err) throw err;
        const {title,summery,content} = req.body;

        const postDoc = await Post.create({
            title,
            summery,
            content,
            cover:newPath,
            author:info.id,
            
        })
    
        res.json(postDoc);
    })   
})

app.put('/post', uploadMiddleWare.single('file'), async (req, res) => {
    let newPath = null;
    if (req.file) {
        const { originalname, path } = req.file;
        const parts = originalname.split('.');
        const ext = parts[parts.length - 1];
        newPath = path + '.' + ext;
        fs.renameSync(path, newPath);
    }

    const { token } = req.cookies;
    jwt.verify(token, secret, {}, async (err, info) => {
        if (err) throw err;
        const { id, title, summery, content } = req.body;
        const postDoc = await Post.findById(id);

        const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
        
        if (!isAuthor) {
            return res.status(400).json('You are not the author');
        } 

        // Update the post document using Mongoose's update method
        await Post.findByIdAndUpdate(id, {
            title,
            summery,
            content,
            cover: newPath ? newPath : postDoc.cover,
        });

        // Fetch the updated document after the update
        const updatedPostDoc = await Post.findById(id);
        res.json(updatedPostDoc);
    });
});

app.get('/post',async (req,res) => {

    res.json(await Post.find()
    .populate('author',['username'])
    .sort({createdAt: -1})
    .limit(20)
    );
})

app.get('/post/:id', async (req,res) => {
    const {id} = req.params;
    const postDoc = await Post.findById(id).populate('author',['username']);
    res.json(postDoc);
})

app.listen(4000);


