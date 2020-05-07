const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const {generateMessage, generateLocationMessage} = require('./utils/messages')
const {addUser, removeUser, getUser, getUsersInRoom} = require('./utils/users')


const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname,'../public')

app.use(express.static(publicDirectoryPath))


io.on('connection', (socket)=>{
    console.log('new socket connection')

    

    socket.on('join', ({username, room}, callback) =>{
        const {error, user} = addUser({ id: socket.id, username, room })

        if(error){
           return callback(error)
        }

        socket.join(user.room)

        socket.emit('welcomeUser',generateMessage('Welcome!! '+user.username))
        socket.broadcast.to(user.room).emit('welcomeUser',generateMessage(`${user.username} has joined!`))
        io.to(user.room).emit('roomData',{
            room:user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })


    socket.on('sendMessage',(news,callback)=>{
        const user = getUser(socket.id)
        const filter = new Filter()

        if(filter.isProfane(news)){
            return callback('Profanity is not allowed')
        }

       socket.emit('welcomeUser', generateMessage('You',news))
        socket.broadcast.to(user.room).emit('welcomeUser', generateMessage(user.username,news))
        
        callback()
    })

    socket.on('disconnect', ()=>{
        const user = removeUser(socket.id)

        if(user){
            io.to(user.room).emit('welcomeUser', generateMessage(user.username,`${user.username} has left`))
            io.to(user.room).emit('roomData', {
                room:user.room,
                users:getUsersInRoom(user.room)
            })
        }
    })

    socket.on("sendLocation",(position, callback)=>{
        const user = getUser(socket.id)

    
        io.to(user.room).emit('locationMessage',generateLocationMessage(user.username,`https://google.com/maps?q=${position.lattitude},${position.longitude}`))
        callback('Location Shared')
   
         
    })
})


server.listen(port, ()=>{
    console.log('system is running successfully on port '+port)
})