var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var people = {};
var users = [];
var ids = [];

app.get('/', function(req, res){
  res.sendfile('index.html'); //Connect the front-end to back-end
});

//.emit() is calling the function either from server side or client side
//.on() is defining a function that can be called using .emit()

io.on('connection', function(socket){ //Once a clinet connects to the server, do stuff

  //User leaves chat room
  socket.on('disconnect', function(){
    var name = people[socket.id];   //Get username of leaving client 
    delete people[socket.id];       //Delete there socket from list
    var bool = false;               //Temp Variable 
    for(i = 0; i < users.length; i++){
      if(name == users[i]){         
        users.splice(i, 1);          //Delete clients username from array 
        ids.splice(i, 1);             //Delete clients id from array
        bool = true;                 //Set value to true
      }
    }
    if(bool){   //If True, The client is leaving only once
      io.emit("update", name + " has left the chat room."); //Let everyone else know the client has left
      console.log('User disconnected: ' + name); //Echo in server that client has left
      io.emit("update-people", people); //Update the list of users conntected
    }
    else{     //If client pressed log out, then closed the tab, dont echo anything
      console.log(" ");
    }
  });
  //User sends message
  socket.on('chat message', function(msg, ifMe){
    var name = people[socket.id]; //Get the username name of client sending message 
    var msg = msg.trim(); //Remove white spaces from message
    ifMe = true;
    if (msg.substr(0, 3) === '/w '){  //Private message
        var msg = msg.substr(3);  //Dont include /w in parsing the message
        var index = msg.indexOf(' '); //Get the index of the space following the username specified 
        if(index !== -1){  //If the index is a positive number, then a message exists
          var username = msg.substring(0, index); //So, the username is from after the space following /w to the index of the space after the username
          if(username === name){ //Check to see if the client wants to private message themselves
            socket.emit("private message", "Error: You can't private message yourself!!");  //call the function private message on the client side to send an error message
            console.log("You can't whisper to yourself Idiot!!"); //Echo a funny message to the server (+1 Karma point)
          }
          else{ //If client is not trying to private message themself
              var msg = msg.substring(index + 1); //The message is from the space to the end to the string
              for(i = 0; i < users.length; i++){
                    if(username == users[i]){ //If the user name exists 
                        var bool = true;
                        socket.emit("private message", "Private Message sent to: " + username); //Call function on client side to send success message to client
                        console.log("Whisper");//Whisper!!!!!!
                        socket.broadcast.to(ids[i]).emit("whisper", name + ": " + msg ); //Call function on client side to send the message to specified user
                        socket.emit(ids[i]).emit("whisper", name + ": " + msg ); //Send same message to client as well
                      }
              }
              if(!bool){  //If bool is false, then the username is not in the chat room
                socket.emit("private message", "Error: User Name not found!!"); //Notify client the username doesn't exist by calling the function from client side
                console.log("Username: " + username + "  Message: " + msg);
                console.log("Error: User Name does not exist Dumbass!!!!"); //+1 Karma point
              }
            }
        }
        else{ //iF there is no message following the username specified
          socket.emit("private message", "Error: Please enter a message!!"); //Send the user an error message
          console.log("Error please enter a message for your Whisper you Fuck!!!"); //+1 Karma point
        }
    }
    else
          io.emit('chat message', name + ": " + msg); //If not a private message then broadcast to everyone in chat room
  });
  //User joins the chat room
  socket.on("join", function(name){
        people[socket.id] = name; //Save the username passed in from the client side into the people array
        socket.emit("chat message", "You have connected to the server."); //Call the function "Chat message" from the client side and pass the message a parameter
        socket.emit("info", name); //Call the function on the client side and send if the name of the user
        socket.broadcast.emit("update", name + " has joined the chat room."); //Call the functin from client side to display that the client has joined the chat room
        io.emit("update-people", people); //Updata the list of online users by calling the function on the client side
   });
  //Called if the user clicks the log out button instead of closing tab
  socket.on("leave", function(){  
      socket.emit("disconnect"); //just call the disconnect function
  });
  //Store the new username into array
  socket.on("give username", function(){
        var name = people[socket.id]; //Get the username of client
        console.log("Username joined: " + name);  //Echo to server the user that joined
        users.push(name); //Put the username into an array called users
        ids.push(socket.id); //Put the socket id into an array called ids
  });
  //Check if a user is typing
  socket.on("typing", function(data) {
    if (typeof people[socket.id] !== "undefined"){  //Check if the user exists
      var name = people[socket.id]; //Get the name of the user/client
      socket.broadcast.emit("isTyping", {isTyping: data, person: name}); //call the function on the client side to echo out which user is typing
    }
  });
  socket.on("changeUserName", function(newName){  //If the user decides to change their username
    var name = people[socket.id]; //Get the oriinal username 
    if(name == newName){  //Check to see if the new name and the old name are the same
      socket.emit("private message", "Error: That is the same User Name!!!"); //If they are send an error message
    }   
    else{ //If not the same
      people[socket.id] = newName;    //set the new name to the location of the old name
      for (var i = 0; i < users.length; i++) {  //Loop through the array of usernames
        if(users[i] == newName){
          socket.emit('private message', "Error: User Name already exists :(");
        }
        else if(users[i] == name){
          users[i] = newName; //Replace the old name with the new one
          io.emit("update", name + " is now " + newName); //Let everyone know of the change
          io.emit("update-people", people); //Update the list of users online to change the user that changed their name
          socket.emit('info', newName); //Change the name of the user on their screen
        }
      }
      console.log(name + " changed name to " + newName); //Echo to the console from the server which user changed their username
    }
  });
  socket.on("checkIfUserExist", function(name){ //Function to check if the user name already exists when clients are selecting a user Name
    var bool = false; 
    for (var i = 0; i < users.length; i++) {    //Loop through list of user names
      if(name == users[i]){ //If the user name selected is in the user name array 
        bool = true;  
        socket.emit("private message", "Error: User Name already exists :("); //Send an error message to the user
      }
    }
    return bool;
  });
  socket.on('goto server', function(boolean){ //Function to come to the server side
    var name = people[socket.id]; //Get the name of the client that made the request
    if(boolean) //If the parameter sent is true
      io.emit('chat message', name + " is back!");  //Tell everyone in the chat room that the client has returned
    else
      io.emit('chat message', name + " is away!");  //Else tell everyone in the chat room theat the client is out. (Not logged out, just away)
  });

});
http.listen(3000, function(){ //Run the server
  console.log('listening on *:3000'); //Echo that the server is running 
});
