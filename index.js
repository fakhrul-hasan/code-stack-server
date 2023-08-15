const express = require('express');
const cors = require('cors');
require('dotenv').config({path: './.env'});
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req,res)=>{
    res.send('server is running');
});
app.listen(port, ()=>{
    console.log(`app is running on port: ${port}`);
});