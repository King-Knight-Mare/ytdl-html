const rp = require('request-promise')
const Video = require('./Video')
const Channel = require('./Channel')
const Playlist = require('./Playlist')
const ytdl = require('ytdl-core')
const fs = require('fs')
const url = require('url')
/**
* Class that interacts with the api
* @property {string} apiKey - Your api key
*/
class YoutubeInteractor {
    /**
    * @param {string} apiKey - Your api key
    */
    constructor(apiKey){
        this.apiKey = apiKey
        rp({
            uri:`https://www.googleapis.com/youtube/v3/search`,
            qs:{
                key:this.apiKey,
                part:'snippet',
                q:'Test'
            },
            json:true
        })
            .catch(err => { 
                console.log(err)
            });
    }
    /**
    * Searches youtube
    * @param {string} query - Term to search for
    * @param {number} max - Max results(0 - 50)defaults to ten
    * @return {Promise<<Array.<Video>>>}
    * @example
    * youtube.search('star wars')
    *     .then(videos => {
    *         console.log(videos)
    *     })
    */
    async search(term, max, order){
        return new Promise(async resolve => {
            let base = await rp({
                uri:'https://www.googleapis.com/youtube/v3/search',
                qs:{
                    key:this.apiKey,
                    part:'snippet',
                    q:term,
                    order:order,
                    maxResults:max || 10,
                },
                json:true
            })
            
            resolve(base.items.map(item => {
                if(!item.id) return {type: "NO PLS WHYYYYYYYY"}
                if(item.id.kind == 'youtube#playlist') return new Playlist(item, this.apiKey)
                if(item.id.kind == 'youtube#video') return new Video(item, this.apiKey)
                if(item.id.kind == 'youtube#channel') return new Channel(item, this.apiKey)
                return {type: "NO PLS WHYYYYYYYY"}
            }))
            
        })
    }
    /**
    * Searches videos
    * @param {string} query - Term to search for
    * @param {number} max - Max results(0 - 50)defaults to ten
    * @return {Promise<Video[]>}
    * @example
    * youtube.searchVideos('star wars')
    *     .then(videos => {
    *         console.log(videos)
    *     })
    */
    async searchVideos(term, max){
        return new Promise(async resolve => {
            let base = await rp({
                uri:'https://www.googleapis.com/youtube/v3/search',
                qs:{
                    key:this.apiKey,
                    part:'snippet',
                    q:term,
                    maxResults:max || 10,
                    type:'video'
                },
                json:true
            })
            resolve(base.items.map(item => new Video(item, this.apiKey)))
        })
    }
    /**
    * Searches channels
    * @param {string} query - Term to search for
    * @param {number} max - Max results(0 - 50)defaults to ten
    * @return {Promise<Channel[]>}
    * @example
    * youtube.searchChannels('Markiplier')
    *     .then(videos => {
    *         console.log(videos)
    *     })
    */
    async searchChannels(term, max){
        return new Promise(async resolve => {
            let base = await rp({
                uri:'https://www.googleapis.com/youtube/v3/search',
                qs:{
                    key:this.apiKey,
                    part:'snippet',
                    q:term,
                    maxResults:max || 10,
                    type:'channel'
                },
                json:true
            })
            resolve(base.items.map(item => new Channel(item, this.apiKey)))
        })
    }
    async downloadVideo(vurl, dir, vid, vids, limit = 165 * 1000 * 1000){
        return new Promise((resolve, reject) => {
            vurl = url.parse(vurl)
            let downloaded = 0;
            vid.title  = vid.title.replace(/[\W_]+/g," ");
            let output = `${dir}/${vids ? vids : 'videos'}/${vid.title}.mp4`
            if (fs.existsSync(output)) {
                resolve();
            } else {
                ytdl.getInfo(vid.id).then((info) => {
                    var format = ytdl.chooseFormat(info.formats, {quality: 'highest'})
                    var parsed = url.parse(format.url);
                    parsed.method = 'HEAD'; // We only want headers to get the filesize
                    rp({
                        uri: format.url,
                        method:'HEAD'
                    })
                        .then(res => {
                            if (res['content-length'] > limit){
                                 ytdl.getInfo(vid.id).then((info) => {
                                    format = ytdl.chooseFormat(info.formats, {quality: '18'})
                                    rp({
                                        uri: format.url,
                                        method:'HEAD'
                                    })
                                        .then(res => {
                                            if (res['content-length'] > limit){
                                                reject('File too big')
                                            }else {
                                                let total = res['content-length'];
                                                let video = ytdl(vurl.href, {format:format});
                                                video.pipe(fs.createWriteStream(output, { flags: 'a' }));
                                                // Will be called if download was already completed and there is nothing more to download.
                                                video.on('complete', function complete(info) {
                                                    'use strict';
                                                    console.log('filename: ' + info._filename + ' already downloaded.');
                                                    resolve({total: total})
                                                });

                                                video.on('end', function() {
                                                    resolve({total: total})
                                                });
                                            }
                                        })
                                  //reject('File too big')
                                 })
                                                           
                            }
                            else {
                                let total = res['content-length'];
                                let video = ytdl(vurl.href, {format:format});
                                video.pipe(fs.createWriteStream(output, { flags: 'a' }));
                                // Will be called if download was already completed and there is nothing more to download.
                                video.on('complete', function complete(info) {
                                    'use strict';
                                    console.log('filename: ' + info._filename + ' already downloaded.');
                                    resolve({total: total})
                                });

                                video.on('end', function() {
                                    resolve({total: total})
                                    console.log('halp')
                                });
                            }
                        })
                  });
                  
            }
        })
    }
    async getLength(vurl){
        return new Promise((resolve, reject) => {
            vurl = url.parse(vurl)
            let id = vurl.query.substr(2)
            
            ytdl.getInfo(id).then((info) => {
                var format = ytdl.chooseFormat(info.formats, {quality: 'highest'})
                let formats = [
                    info.formats.find(f => f.itag == '136'),
                    info.formats.find(f => f.itag == '135'),
                    info.formats.find(f => f.itag == '134'),
                    info.formats.find(f => f.itag == '133'),
                ]
                let fpromises = formats.map(f => {
                    if(!f) return null
                    return rp({
                        uri: f.url,
                        method:'HEAD'
                    })
                })
                  
                Promise.all(fpromises).then(values => {
                    console.log(values.map(r => r['content-length']))
                    resolve(values.map(r => r['content-length']))
                })
                
            })
        })
    }
}
module.exports = YoutubeInteractor