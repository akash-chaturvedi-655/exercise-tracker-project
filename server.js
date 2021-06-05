//require('dotenv').config()
const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const mongoose=require('mongoose');
const mongodb=require('mongodb');
const mySecret = process.env['MONGO_URI']
var assert = require('chai').assert
//var tests=require('./tests');
global.fetch = require("node-fetch");

app.use(cors())
app.use( bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({extended: true})); // to support URL-encoded bodies
app.use(express.static('public'))
mongoose.connect(mySecret, {useNewUrlParser: true, useUnifiedTopology: true});

const schema = mongoose.Schema;
const exerciseschema=new schema({

  description:{
    type: String,
     required:true
     },
  duration:{
    type: Number, 
    required:true
    },
  date: {
    type: Date,
    default: /*() =>*/ //Date.now() },
    Date.now }
})

const userschema=new schema({
  _id: String,
  username: String,
  exercises:[exerciseschema]
})

const user=mongoose.model('user',userschema);
const exercise=mongoose.model('exercise',exerciseschema);

//module.exports = mongoose.model('Post', PostSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post("/api/users/",function(req,res,next)
{
  let username=req.body.username;
  //console.log(username);

  user.findOne({username:username},function(err,docs)
  {
    if(err) return console.log(err);
  
    if(!docs)
    {
    const user_name=new user({
      _id : generateId(),
      username : username
    })
    .save(function(err,result)
    {
      if(err)  return console.log(err);
       res.json(
         {
              "_id" : result._id,
              "username": result["username"]}); 
         }
    );
  }
  else
  {
    user.findOne({username:username},function(err,found)
    {
      if(err) return console.log(err);
      res.json(
        {
          "_id": found._id,
          "username":found.username
          });
    })
  }
  })
})

app.post("/api/users/:_id/exercises",function(req,res,next)
{
var id=req.params._id;
var description=req.body.description;
var duration=req.body.duration;
var date=req.body.date;

user.findOne({"_id":id},function(err,docs)
{
  if(err) return console.log(err);
  if(!docs)
  {
    res.json({"error" : "user not found"});
    res.end();
  }
  else
  {
    var user_exercise={
      //_id:id,
      description:description,
      duration:duration
    }
    if(req.body.date) {
      user_exercise.date=req.body.date;
    }
  var user_exercises=new exercise(user_exercise); 
    user_exercises.save(function(err,found)
    {
      if(err) return console.log(err);
    })

user.findOneAndUpdate(
    {"_id":id},
{  $addToSet: { exercises: user_exercises } },
    function(err,done)
    {
      if(err) console.log(err);
    }
).then(function(post)
{
  console.log("Posted is : "+post);
  let new_date=new Date(post.exercises[0].date);
  var date_final=new_date.toString("dddd, MM dd yyyy").split(' ').slice(0, 4).join(' ');
  
  let id_final=post.exercises[0]._id;
  res.json(
    { 
      "username" : post.username,
      "description" : post.exercises[0].description,
      "duration" : post.exercises[0].duration,
      "_id" : post._id,
      "date" : (post.exercises[0].date).toDateString()
            });
})
  }
});
});

app.get("/api/users",function(req,res,next)
{
  user.find({})
  .select('_id username')
  .exec(function(err,found)
  {
    if(err) return console.log(err);
    res.json(found);
  })
})

app.get("/api/users/:_id/logs",function(req,res,next)
{
  if(Object.keys(req.query).length !== 0)
  {
    next();
    return;
  }
  else
  {
  var id=req.params._id;
  let log=[];
  user.findOne({_id:id} ,function(err,found)
  {
    if(err) return console.log("Error : "+err);
  })
  .select({})
  .exec(function(err,posted)
  {
    if(err) return console.log(err);
let count=0;
let mod_exercises=posted["exercises"];
let array=[];
for(const x in mod_exercises)
{
  count++;
}

function modifyDate(iterable)
{ 
let obj=iterable;
for (const [key, value] of Object.entries(obj))
 {
  if(key=="date") obj[key] = (new Date(value).toDateString());
  }
return obj;
}

  res.json({
    "_id" : posted._id,
    "username" : posted.username,
    "count" : count,
    "log": mod_exercises
        })
  })
  }
})

app.get("/api/users/:_id/logs",function(req,res,next)
{

let limit;
  let userId = req.params._id;
  if(req.query.limit) limit = parseInt(req.query.limit, 10);
  let start = new Date(req.query.from);
  let end = new Date(req.query.to); 
  
  console.log("UserId: "+userId+"from: "+start+"to: "+end+"limit: "+limit);
  
/*
   if (start == "Invalid Date" || end == "Invalid Date"){
    user.findOne({"_id": userId}, (err, data)=>{
      if(err){res.json("Invalid date")}
      else{
        res.json("Invalid date range. Sending full log: " + data);
      }
    });
  }
   else
   {
  */
    user.findOne({"_id": userId},
    function(err, data)
    {
      console.log("I ahve found the data :"+data);
      if(err) console.log("There was an error");
      else if (data == null)
      {
        res.send("User does not exist");
      }
      else
      {
        console.log("Exercise data found is :"+data.exercises);
        let result = data.exercises.filter(function(d)
        {
          if(d.date < start || d.date>end){
            return false
          }else{
            return true;
          }
        });
        console.log("Result is :\n"+result);
        let count=0;
        //if(req.query.limit) count= limit;
        for(let i in result)
        {
          count++;
        }
        if (!limit)
        {
           res.json(
             {
               "_id":userId,
             "username":data.username,
             "from":new Date(start).toDateString(),
             "to":new Date(end).toDateString(),
              "count":count,
              "log" : result
              }
             );
        }
        else
        {
          let limResult = result.slice(0,limit);
          res.json(
        {
            "_id":userId,
             "username":data.username,
             "from":new Date(start).toDateString(),
             "to":new Date(end).toDateString(),
              "count":count,
              "log":limResult
        }
        );
        }
      }
    });
 // }
})

function generateId()
{
  return Math.floor(Math.random() * 1234321).toString();
}
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//run(getUserInput);
