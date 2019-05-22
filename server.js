// server.js
// where your node app starts
// init project

// init project
const http = require('http')
const path = require('path');
const fs = require('fs');
const express = require('express');
const app = express();
const server = http.Server(app);
const Mapper = require('./mapper.js')
const port = process.env.PORT || 5000;
const socketIO = require('socket.io');
const io = socketIO(server);
const youtube = require('./src/youtube.js')
let yt = new youtube('AIzaSyCuGHc2cSDYfkee9cn9iqY71nPaZ_NsSRc')
let files = new Mapper()
let queue = []
let currDl = false
let vidDl = false
let limit = 165 * 1000 * 1000
let deleteFolderRecursive = function(path) {
    if( fs.existsSync(path) ) {
            fs.readdirSync(path).forEach(function(file,index){
            var curPath = path + "/" + file;

            if(fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};
setInterval(() => {
    if(queue[0] || currDl) return
    deleteFolderRecursive(__dirname + '/videos')
    if(fs.existsSync(__dirname + '/.git')) deleteFolderRecursive(__dirname + '/.git')
    if (!fs.existsSync(__dirname + '/videos')) fs.mkdirSync(__dirname + '/videos');
}, 10000)

let nextQueue = () => {
    queue.splice(0, 1)
    if(!queue[0]) return
    while(queue.find((element, i) => element.socket.disconnected == true)) queue.splice(queue.findIndex((element, i) => element.socket.disconnected == true), 1)
    if(!queue[0]) return
    queue.forEach((l, i) => {
        if(i){ 
            l.socket.emit('notifUpdate', {
                id:l.notif.id,
                title:l.notif.title,
                body:`You are currently number ${i + 1}/${queue.length}`,
                type:'queue'
            })
        }
        
    })
    let socket = queue[0].socket
    let notif = queue[0].notif
    notif.title = notif.title.replace(/Queing Video: /g, 'Getting your video: ')
    notif.body = 'Your download should progress shortly'
    notif.type = 'dwnld'
    socket.emit('notifUpdate', notif)
    socket.emit('downloading')
    let vid = queue[0].vid
    let url = `https://youtube.com/search?v=${vid.id}`
    currDl = true
    vidDl = false
    
    setTimeout(() => {
        if(socket.disconnected && queue[0].socket == socket){
            fs.unlink(__dirname + '/videos/' + vid.title.replace(/[\W_]+/g," ") + '.mp4', () => {
                currDl = false
                nextQueue()
            })
        }
    }, 20000)
    let notifId = notif.id
    yt.getLength(url).then(lengths => {
        let itags = [
            '136',
            '135',
            '134',
            '133'
        ]
        
    })
    yt.downloadVideo(url, __dirname, vid)
         .then(({total}) => {
              vid.title  = vid.title.replace(/[\W_]+/g," ");
              socket.emit('done', {fileName: vid.title + '.mp4', notifId: notifId})
              files.set(vid.title + '.mp4', total)
              socket.emit('notif', {
                  id:notifId,
                  title:`Now downloading : ${vid.title} !`,
                  body:'Currently downloading your video!',
                  type:'done',
                  edit:true
              })
              currDl = true
              vidDl = true
          })
          .catch(err => {
              if(err == 'File too big'){
                  socket.emit('notif', {
                      id:notifId,
                      title:`Sorry this file is too big: ${vid.title}!`,
                      body:`Please try a smaller file`,
                      type:'tooBig',
                      edit:true
                  })
              }

              nextQueue()
              vidDl = true
          })
}
// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));
app.use('/videos', express.static('videos'))
// http://expressjs.com/en/starter/basic-routing.html
app.get('/', function(request, response) {
  response.sendFile(__dirname + '/out/index.html');
});
server.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + server.address().port);
});
yt.getLength('https://youtube.com/?v=VNlm_ksTXr4')
io.on('connection', socket => {
    socket.on('disconnect', () => {
        if(!queue[0]) return
        let n
        if(queue[0].socket.id == socket.id) n = true
        queue.forEach((l, i) => {
            if(l.socket.id == socket.id) queue.splice(i,  1)
        })
        if(n) nextQueue()
    })
    socket.on('search', sent => {
        yt.search(sent.query, 50, sent.sortBy)
            .then(vids => {
                let ret = vids.map((vid, i) => {
                    if(!vid){ console.log(vids.length, i);console.log(vids[i])}
                    if(vid.type == 'video'){
                        return {
                            title:vid.title, 
                            id: vid.id,
                            thumbnail:vid.thumbnails.high,
                            channel:vid.channel,
                            type:'video'
                        }
                    }else if(vid.type == 'channel'){
                        return {
                            title:vid.title,
                            thumbnail:vid.thumbnails.high,
                            type:'channel'
                        }
                    }else if(vid.type == 'playlist'){
                        return {
                            title:vid.title,
                            thumbnail:vid.thumbnails.high,
                            type:'playlist'
                        }
                    }
                })
                socket.emit('search', ret)
            })
    })
    socket.on('download', vid => {
        if(!queue.length){
            let url = `https://youtube.com/search?v=${vid.id}`
            queue.push({socket:socket, vid: vid})
            let notifId = Math.random()
            socket.emit('notif', {
                id:notifId,
                title:`Getting your video: ${vid.title} !`,
                body:'Your download should progress shortly',
                type:'dwnld'
            })
            vidDl = false
            setTimeout(() => {
                if(!queue[0]) return
                if(socket.disconnected && queue[0].socket == socket){
                    fs.unlink(__dirname + '/videos/' + vid.title.replace(/[\W_]+/g," ") + '.mp4', () => {
                        currDl = false
                        nextQueue()
                    })
                }
            }, 20000)
            yt.downloadVideo(url, __dirname, vid)
               .then(({total}) => {
                    vid.title  = vid.title.replace(/[\W_]+/g," ");
                    socket.emit('done', {fileName: vid.title + '.mp4', notifId: notifId})
                    files.set(vid.title + '.mp4', total)
                    socket.emit('notif', {
                        id:notifId,
                        title:`Now downloading : ${vid.title} !`,
                        body:'Currently downloading your video!',
                        type:'done',
                        edit:true
                    })
                    currDl = true
                    vidDl = true
                })
                .catch(err => {
                    if(err == 'File too big'){
                        socket.emit('notif', {
                            id:notifId,
                            title:`Sorry this file is too big: ${vid.title}!`,
                            body:`Please try a smaller file`,
                            type:'tooBig',
                            edit:true
                        })
                    }
                    
                    nextQueue()
                    vidDl = true
                })
        }
        else {
            let notif = {
                id:Math.random(),
                title:`Queing Video: ${vid.title} !`,
                body:`You are currently number ${queue.length}/${queue.length}`,
                type:'queue'
            }
            socket.emit('notif', notif)
            queue.push({
                socket:socket, 
                vid: vid,
                notif:notif
            })
            queue.forEach((l, i) => {
                if(i){
                    l.socket.emit('notifUpdate', {
                        id:l.notif.id,
                        title:l.notif.title,
                        body:`You are currently number ${i + 1}/${queue.length}`,
                        type:'queue',
                        edit:true
                    })
                }

            })
        }
    })
    socket.on('del', fileName => {
        fs.unlink(__dirname + '/videos/' + fileName, () => {
            currDl = false
            nextQueue()
        })
        
    })
    socket.on('log', console.log)
    
})