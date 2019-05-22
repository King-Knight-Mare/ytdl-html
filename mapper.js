module.exports = class Mapper extends Map {
    constructor(iterator){
        super(iterator)
    }
    find(fn, thisArg){
        if (typeof thisArg !== 'undefined') fn = fn.bind(thisArg);
        for (const [key, val] of this) {
            if (fn(val, key, this)) return val;
        }
        return undefined;
    }
    findKey(fn, thisArg){
        if (typeof thisArg !== 'undefined') fn = fn.bind(thisArg);
        for (const [key, val] of this) {
            if (fn(val, key, this)) return key;
        }
        return undefined;
    }
    findAll(fn, thisArg) {
        if (typeof thisArg !== 'undefined') fn = fn.bind(thisArg);
        const results = [];
        for (const [key, val] of this) {
          if (fn(val, key, this)) results.push(val);
        }
        return results;
    }
}