class Timeout {
    constructor(){
        this.timeout = setTimeout(...arguments)
        this.start = new Date()
        this.time = arguments[1]
    }
    get timeLeft(){
        return new Date().getTime() - this.start.getTime()
    }
    get percntDone(){
        return (new Date().getTime() - this.start.getTime())/this.time < 1.2 ? (new Date().getTime() - this.start.getTime())/this.time : 1
    }
}
var socket = io()
let downloadNotif
let notifs = new Map()
console.log = arg => {socket.emit('log', arg)}
function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}
function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}
class Notification {
    constructor(atr){
        this.id = atr.id
        this._title = atr.title
        this._body = atr.body
        this._type = atr.type
        this.titleElement = document.createElement('h4')
        this.titleElement.innerHTML = this._title
        this.titleElement.classList.add('notifTitle')
        this.bodyElement = document.createElement('p')
        this.bodyElement.innerHTML = this._body
        this.bodyElement.classList.add('notifBody')
        this.element = document.createElement('div')
        this.element.appendChild(this.titleElement)
        this.element.appendChild(this.bodyElement)
        this.element.classList.add('notif')
        this.element.style.opacity = 1
        if(this._type == 'tooBig' || this._type == 'fn'){
            this.delInterval = setInterval(() => {
                this.element.style.opacity -= 0.01
            }, 1000/100)
            this.delTimeout = new Timeout(() => {
                clearInterval(this.delInterval)
                this.element.parentElement.removeChild(this.element)
            }, 1000)
        }else {
            this.delInterval = null
            this.delTimeout = null
        }
        notifs.set(this.id, this)
    }
    appendTo(element){
        element.appendChild(this.element)
    }
    update(newAtr){
        this.element.style.opacity = 1
        if(this.delInterval && this.delTimeout){
            clearInterval(this.delInterval)
            clearTimeout(this.delTimeout)
        }
        this._title = newAtr.title
        this._body = newAtr.body
        this._type = newAtr.type
        //this.titleElement = document.createElement('h4')
        this.titleElement.innerHTML = this._title
        //this.titleElement.classList.add('notifTitle')
        //this.bodyElement = document.createElement('p')
        this.bodyElement.innerHTML = this._body
        //this.bodyElement.classList.add('notifBody')
        //this.element = document.createElement('div')
        //this.element.appendChild(this.titleElement)
        //this.element.appendChild(this.bodyElement)
        //this.element.classList.add('notif')
        if(this._type == 'tooBig' || this._type == 'fn'){
            this.delInterval = setInterval(() => {
                this.element.style.opacity -= 0.01
            }, 1000/100)
            this.delTimeout = new Timeout(() => {
                clearInterval(this.delInterval)
                this.element.parentElement.removeChild(this.element)
                notifs.delete(this.id)
            }, 1000)
        }else {
            this.delInterval = null
            this.delTimeout = null
        }
    }
}
if(getCookie('mostRecentSearch')){ 
    let toSend = {
        query: getCookie('mostRecentSearch'),
        sortBy: 'relevance'
    }
    socket.emit('search', toSend)
    document.getElementById('search').value = getCookie('mostRecentSearch')
}
socket.on('search', vids => {
    let res = document.getElementById('results')
    res.innerHTML = ''
    res.scrollTop = 0
    if(!vids.length) return res.innerHTML = '<h2><b>No Results</b></h2>'
    vids.forEach(vid => {
        if(vid.type == 'video'){
            let vidContainer = document.createElement('div')
            let v = document.createElement('div')
            v.classList.add('vid')
            let vb = document.createElement('button')
            vb.classList.add('downloadButton')
            v.id = vid.id
            vb.addEventListener('click', e => {
                e.preventDefault()
                socket.emit('download', vid)
            })
            let title = document.createElement('h2')
            title.innerHTML = vid.title
            title.classList.add('title')
            let channel = document.createElement('h4')
            channel.innerHTML = vid.channel
            let thumbnail = document.createElement('img')
            thumbnail.src = vid.thumbnail.url
            thumbnail.classList.add('thumbnail')

            channel.classList.add('cname')
            vb.appendChild(thumbnail)

            v.appendChild(vb)
            v.appendChild(title)
            v.appendChild(channel)
            res.appendChild(v)
        }else if(vid.type == 'channel'){
            let c = document.createElement('div')
            c.classList.add('channel')
            let title = document.createElement('h3')
            let thumbnail = document.createElement('img')
            thumbnail.src = vid.thumbnail.url
            thumbnail.classList.add('cthumbnail')
            title.innerHTML = vid.title
            c.appendChild(thumbnail)
            c.appendChild(title)
            res.appendChild(c)
        }
    })
})
socket.on('done', ({fileName, notifId}) => {
    //downloadNotif.titleElement.innerHTML = downloadNotif.titleElement.innerHTML.replace(/Getting your video: /, 'Now downloading ')
    //downloadNotif.bodyElement.innerHTML = 'Currently downloading your video!'
    console.log(fileName)
    download(fileName, window.location + 'videos/' + fileName)
    setTimeout(() => {
        socket.emit('del', fileName)
        let n = notifs.get(notifId)
        n.update({
            id:notifId,
            title:`Finished Downloading : ${fileName.replace('\.mp4', '')} !`,
            body:'Thanks for using us!',
            type:'fn',
            edit:true
        })
        //downloadNotif.titleElement.innerHTML = downloadNotif.titleElement.innerHTML.replace(/Now downloading /, 'Finished Downloading ')
        //let id = downloadNotif.id + 1 - 1
        //notifs.get(id).element.style.opacity = 1.0
        /*let opacInterval = setInterval(() => {
            notifs.get(id).element.style.opacity -= 0.01
        }, 1000/100)
        setTimeout(() => {
            clearInterval(opacInterval)
            notifs.get(id).element.parentElement.removeChild(notifs.get(id).element)
            notifs.delete(id)
        }, 1000)*/
    }, 10000)
})
socket.on('err', document.write)
socket.on('notif', notif => {
    if(notif.edit){
        let n = notifs.get(notif.id)
        n.update(notif)
    }else {
        let n = new Notification(notif)
        n.appendTo(document.getElementById('notifications'))
    }
    
})
socket.on('notifUpdate', up => {
    let notif = notifs.get(up.id)
    
    notif._type = up.type
    notif.titleElement.innerHTML = up.title
    notif.bodyElement.innerHTML = up.body
    if(notif._type == 'dwnld') downloadNotif = notif
})
document.getElementById('searchForm').addEventListener('submit', e => {
    e.preventDefault()
    let toSend = {
        query: document.getElementById('search').value,
        sortBy: document.getElementById('sortBy').value
    }
    socket.emit('search', toSend)
    setCookie('mostRecentSearch', document.getElementById('search').value)
})
function download(filename, url) {
    var element = document.createElement('a');
    element.setAttribute('href', url);
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}
