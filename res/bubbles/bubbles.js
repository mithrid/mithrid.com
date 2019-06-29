// This animation was inspired by the CodeAcademy example.

// --------------------------------------- Global vars.
// TODO(Brendan): split into separate files and use Babel.

// Tuning vars for bubble movement.
document.bubbleShape = 'circle';
document.reassimilationLag = 0.40; // [0, 1.0]; larger = long time for bubbles to return to starting position.
document.repelForce = 0.3; // (0.0, x)
document.bounceReducer = 400; // larger -> bounces less -> smaller.
document.sizeReducer = 4; // [0-5]; alphabet.js assigns Point sizes starting at 6, but some are too big.
document.mouseRepelDistance = 40; // Distance at which the text begins to be repelled from cursor.
document.resetAnimation = false; // Used to reset animation.

// Global vars.
var canvas = $("#myCanvas");
var canvasHeight = canvas.height();
var canvasWidth = canvas.width();
var ctx;
var pointCollection;

// --------------------------------------- Entry point. Draw some text.

function drawText(text, letterColorsHsl) {
    // Validate name and letterColorsHsl parameters.
    if (text === undefined) {
        throw "Must specify text to draw."
    }
    if (letterColorsHsl === undefined || !isObjectArray(letterColorsHsl) || letterColorsHsl.length === 0) {
        throw "letterColorsHsl must be a non-empty array."
    }
    updateCanvasDimensions();

    var g = [];
    var offset = 0;
    function addLetter(cc_hex, ix, letterCols) {
        if (isObjectArray(letterCols[0])) {
            letterColorsHsl = letterCols;
        } else if (typeof letterCols[0] === "number") {
            letterColorsHsl = [letterCols];
        }

        if (document.alphabet.hasOwnProperty(cc_hex)) {
            var chr_data = document.alphabet[cc_hex].P;
            var bc = letterColorsHsl[ix % letterColorsHsl.length];

            for (var i = 0; i < chr_data.length; ++i) {
                point = chr_data[i];

                g.push(new Point(point[0] + offset,
                    point[1],
                    0.0,
                    point[2] - document.sizeReducer,
                    makeColor(bc, point[3])));
            }
            offset += document.alphabet[cc_hex].W;
        }
    }

    var hexStr = strToHex(text);
    var col_ix = -1;
    for (var i = 0; i < hexStr.length; i += 2) {
        var cc_hex = "A" + hexStr.charAt(i) + hexStr.charAt(i + 1);
        if (cc_hex !== "A20") { // See alphabet.js.
            col_ix++;
        }
        addLetter(cc_hex, col_ix, letterColorsHsl);
    }

    for (var j = 0; j < g.length; j++) {
        g[j].curPos.x = (canvasWidth / 2 - offset / 2) + g[j].curPos.x;
        g[j].curPos.y = (canvasHeight / 2 - 180) + g[j].curPos.y;
        g[j].originalPos.x = (canvasWidth / 2 - offset / 2) + g[j].originalPos.x;
        g[j].originalPos.y = (canvasHeight / 2 - 180) + g[j].originalPos.y;
    }

    pointCollection = new PointCollection();
    pointCollection.points = g;
    initEventListeners();
}

// --------------------------------------- Event Logic.

$(window).mouseleave(function () {
    document.resetAnimation = true;
});

$(window).mouseenter(function () {
    document.resetAnimation = false;
});

function updateCanvasDimensions() {
    canvasWidth = canvas.width();
    canvasHeight = canvas.height();

    draw();

    setTimeout(function () {
        updateCanvasDimensions();
    }, 30);
}

function onMove(e) {
    if (pointCollection) {
        pointCollection.mousePos.set(e.pageX, e.pageY);
    }
}

function onTouchMove(e) {
    if (pointCollection) {
        pointCollection.mousePos.set(e.targetTouches[0].pageX, e.targetTouches[0].pageY);
    }
}

function initEventListeners() {
    $(window).bind('resize', updateCanvasDimensions).bind('mousemove', onMove);

    canvas.ontouchmove = function (e) {
        e.preventDefault();
        onTouchMove(e);
    };

    canvas.ontouchstart = function (e) {
        e.preventDefault();
    };
}

// --------------------------------------- Draw.

function draw(reset) {
    // Get canvas.
    var tmpCanvas = canvas.get(0);
    if (tmpCanvas.getContext === null) {
        return;
    }

    // Clear 2D drawing area.
    ctx = tmpCanvas.getContext('2d');
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    if (pointCollection) {
        pointCollection.draw(document.bubbleShape, reset);
    }
}

function update() {
    if (pointCollection) {
        pointCollection.update();
    }
}

function bounceBubbles() {
    draw();
    update();

    setTimeout(function () {
        bounceBubbles()
    }, 30);
}

// --------------------------------------- Utility functions.

function makeColor(hslList) {
    var hue = hslList[0];
    var sat = hslList[1];
    var lgt = hslList[2];
    return "hsl(" + hue + "," + sat + "%," + lgt + "%)";
}

function strToHex(str) {
    var hexStr = "";
    for (var i = 0; i < str.length; i++) {
        hexStr += str.charCodeAt(i).toString(16);
    }
    return hexStr;
}

function isObjectArray(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]'
}

// --------------------------------------- Classes, but as functions.

function Vector(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;

    this.set = function (x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    };
}

function Point(x, y, z, size, color) {
    this.curPos = new Vector(x, y, z);
    this.color = color;
    this.reassimilationLag = document.reassimilationLag;
    this.repelForce = document.repelForce;
    this.bounceReducer = document.bounceReducer;
    this.originalPos = new Vector(x, y, z);
    this.targetPos = new Vector(x, y, z);
    this.radius = size;
    this.size = size;
    this.velocity = new Vector(0.0, 0.0, 0.0);

    this.update = function () {
        // Compute 3D acceleration.
        var dx = this.targetPos.x - this.curPos.x;
        var dy = this.targetPos.y - this.curPos.y;
        var dox = this.originalPos.x - this.curPos.x;
        var doy = this.originalPos.y - this.curPos.y;
        var d = Math.sqrt((dox * dox) + (doy * doy));
        this.targetPos.z = d / this.bounceReducer + 1;
        this.targetPos.z = d / this.bounceReducer + 1;
        var dz = this.targetPos.z - this.curPos.z;
        var ax = dx * this.repelForce;
        var ay = dy * this.repelForce;
        var az = dz * this.repelForce;

        // Compute velocity.
        this.velocity.x += ax;
        this.velocity.x *= this.reassimilationLag;
        this.velocity.y += ay;
        this.velocity.y *= this.reassimilationLag;
        this.velocity.z += az;
        this.velocity.z *= this.reassimilationLag;

        // Computer position; Note: updating position AFTER velocity gives us significantly more accurate results!
        this.curPos.x += this.velocity.x;
        this.curPos.y += this.velocity.y;
        this.curPos.z += this.velocity.z;

        // Update the radius based on distance from viewer (z-axis).
        this.radius = this.size * this.curPos.z;
        if (this.radius < 1) this.radius = 1;
    };

    this.draw = function (bubbleShape, dx, dy) {
        // TODO(Brendan): enum with Object.freeze()
        ctx.fillStyle = this.color;
        if (bubbleShape === "square") {
            ctx.beginPath();
            ctx.fillRect(this.curPos.x + dx, this.curPos.y + dy, this.radius * 1.5, this.radius * 1.5);
        }
        else if (bubbleShape === 'circle') {
            ctx.beginPath();
            ctx.arc(this.curPos.x + dx, this.curPos.y + dy, this.radius, 0, Math.PI * 2, true);
            ctx.fill();
        }
        else throw "Only square and circle drawing supported right now."
    }
}

function PointCollection() {
    this.mousePos = new Vector(0, 0);
    this.pointCollectionX = 0;
    this.pointCollectionY = 0;
    this.points = [];

    this.update = function () {
        for (var i = 0; i < this.points.length; i++) {
            var point = this.points[i];
            var dx = this.mousePos.x - point.curPos.x;
            var dy = this.mousePos.y - point.curPos.y;
            var d = Math.sqrt((dx * dx) + (dy * dy));

            if (d < document.mouseRepelDistance) {
                point.targetPos.x = point.curPos.x - dx;
                point.targetPos.y = point.curPos.y - dy;
            }
            else {
                point.targetPos.x = point.originalPos.x;
                point.targetPos.y = point.originalPos.y;
            }

            point.update();
        }
    };

    this.draw = function (bubbleShape, reset) {
        for (var i = 0; i < this.points.length; i++) {
            var point = this.points[i];
            if (window.reset) {
                this.pointCollectionX = 0;
                this.pointCollectionY = 0;
                this.mousePos = new Vector(0, 0);
            }

            point.draw(bubbleShape, this.pointCollectionX, this.pointCollectionY, reset);
            point.draw(bubbleShape);
        }
    };

    this.reset = function (bubbleShape) { }
}
