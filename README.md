# sharpthumb

On the fly, image resizing middleware for express using sharp. Images are resized once and stored in a cache. Inspiration comes from sharpie and node-quickthumb.

## Use in conjuction with express.static()

By default, requests will fall through sharpthumb.static() if the static file is not found. In this instance, express.static() will need to be used to serve normal static files.

```
var express = require('express');
var app = express();
var sharpthumb = require('sharpthumb');

app.use(sharpthumb.static(path.join(__dirname, '/public')));
app.use(express.static(path.join(__dirname, '/public')));

app.listen();

```

## Drop-in replacement for express.static()

If you do not require special options or functionality from express.static(), sharpthumb.static() can serve static files directly by setting serveStatic to true.

I usually store my static files in ./public/

```
var express = require('express');
var app = express();
var sharpthumb = require('sharpthumb');

app.use(sharpthumb.static(path.join(__dirname, '/public'), {serveStatic: true}));

app.listen();

```

## Query parameters

Pass sharp options as query parameters in your image requests. You must pass either width OR height for sharpthumb to be activated. Example:

```
<img src='/img.png?width=200&height=200&max=true'/>

```

Here is a list of query parameters that will have an effect. See sharp documentation for more details.

* width
* height
* background
* crop
* flatten
* max
* min


## Options

### cacheDir

Modify the path where cached images are stored. By default ther are stored in the .cache subdirectory of your static dir. So, this would change nothing:

```
var cacheDir = path.join(__dirname, '/public/.cache');
app.use(sharpthumb.static(path.join(__dirname, '/public'), {cacheDir: cacheDir}));

```

### serveStatic

Tell sharpthumb to serve static files in place of express.static() by calling res.sendFile()