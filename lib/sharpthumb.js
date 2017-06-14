var fs = require("q-io/fs"),
    mkdirp = require('mkdirp'),
    path = require('path'),
    q = require('q'),
    sharp = require('sharp')
;

module.exports = { static };

// resize staticPath and save to cachePath
function cache(staticPath, cachePath, params) {
    var d = q.defer();
    //var formatOptions = {};
    mkdirp(cachePath.replace(/[^\/]+$/,''), function(err) {
        if (err) {
            console.error(err);
            d.resolve(staticPath);
        }
    
        var pipeline = sharp(staticPath);
        pipeline.resize(
            params.width ? parseInt(params.width) : null,
            params.height ? parseInt(params.height) : null
        );

        if (params.withoutEnlargement) pipeline.withoutEnlargement();
        if (params.background) pipeline.background(params.background);
        if (params.crop) pipeline.crop(params.crop);
        if (params.flatten) pipeline.flatten();
        if (params.max) pipeline.max();
        if (params.min) pipeline.min();
        //if (params.quality) formatOptions.quality = parseInt(params.quality);

        //pipeline.toFormat('jpg', {quality:100});
        pipeline.toFile(cachePath)
        .then(function() {
            d.resolve(cachePath);
        })
        .catch(function(err) {
            console.log('Error caching', staticPath, err);
            d.resolve(staticPath);
        });
    });

    return d.promise;
}

// call cache() if staticPath has been modified after cachePath was modified
function cacheIfStale(staticStat, staticPath, cachePath, params) {
    var d = q.defer();
    fs.stat(cachePath)
    .then(function(cacheStat) {
        if (staticStat.lastModified() > cacheStat.lastModified()) {
            return q.reject();
        }
        else {
            d.resolve(cachePath);
        }
    })
    .catch(function(err) {
        //console.log(err);
        cache(staticPath, cachePath, params)
        .then(function(path) {
            d.resolve(path);
        });
    });

    return d.promise;
}

// call cacheIfStale() if resize params are set
// otherwise send static static file if it exists and options.serveStatic is true
// otherwise call next()
function handle(options, req, res, next) {

    var staticUrl = decodeURI(req.originalUrl.replace(/\?.*/,'')),
        staticPath = path.normalize(options.staticDir + staticUrl),
        cachePath = path.join(options.cacheDir, safeDirName(req.query), staticUrl)
    ;

    fs.stat(staticPath)
    .then(function(stat) {
        if (!stat.isFile()) {
            return q.reject('not a file');
        }
        if (shouldResize(req)) {
            return cacheIfStale(stat, staticPath, cachePath, req.query);
        }
        if (options.serveStatic) {
            return q.resolve(staticPath);
        } else {
            return q.reject();
        }
    })
    .then(function(path) {
        //console.log(staticUrl,path);
        res.sendFile(path);
    })
    .catch(function(err) { // not a servable file, call next
        //console.log(staticUrl,'next()',err);
        next();
    });
}

// wrapper to convert handle() to a middleware function
function middleware(options) {
    return function(req, res, next) {
        handle(options, req, res, next);
    }
}

// convert query params into a directory name
function safeDirName(obj) {
    return JSON.stringify(obj).replace(/[^\w,=:]/g,'');
}

function shouldResize(req) {
    if (req.path.match(/\.svg$/i)) { // ignore .svg files
        return false;
    }
    if (req.query.width || req.query.height) {
        return true;
    }
}

// express/connect middleware
function static(staticDir, options){
    staticDir = path.normalize(staticDir);
    
    var defaults = {
        cacheDir: path.join(staticDir, '.cache'),
        serveStatic: false,
        staticDir: staticDir
    };

    options = Object.assign(defaults, options);

    return middleware(options);
}