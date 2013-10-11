/*
 * Color Thief v2.0
 * by Lokesh Dhakar - http://www.lokeshdhakar.com
 *
 * Licensed under the Creative Commons Attribution 2.5 License - http://creativecommons.org/licenses/by/2.5/
 *
 * # Thanks
 * Nick Rabinowitz: Created quantize.js which is used by the median cut palette function. This handles all the hard clustering math.
 * John Schulz: All around mad genius who helped clean and optimize the code. @JFSIII
 *
 * ## Classes
 * CanvasImage
 * ## Functions
 * getColor()
 * getPalette()
 * createAreaBasedPalette()
 *
 */


/*
  CanvasImage Class
  Class that wraps the html image element and canvas.
  It also simplifies some of the canvas context manipulation
  with a set of helper functions.
*/

var MMCQ = require('./MMCQ');
var Canvas = require('canvas');
var Image = Canvas.Image;

var CanvasImage = function(filename) {
  var img, self;

  self = this;
  img = new Image;

  img.onerror = function(err) {
    throw err;
  };

  img.onload = function() {
    self.canvas = new Canvas(img.width, img.height);
    self.width = img.width;
    self.height = img.height;
    self.context = self.canvas.getContext('2d');
    self.context.drawImage(img, 0, 0, img.width, img.height);
  };

  img.src = filename;
};

CanvasImage.prototype.clear = function () {
    this.context.clearRect(0, 0, this.width, this.height);
};

CanvasImage.prototype.update = function (imageData) {
    this.context.putImageData(imageData, 0, 0);
};

CanvasImage.prototype.getPixelCount = function () {
    return this.width * this.height;
};

CanvasImage.prototype.getImageData = function () {
    return this.context.getImageData(0, 0, this.width, this.height);
};

CanvasImage.prototype.removeCanvas = function () {
    //$(this.canvas).remove();
};


/*
 * getDominantColor(sourceImageFilename)
 * returns {r: num, g: num, b: num}
 *
 * Use the median cut algorithm provided by quantize.js to cluster similar
 * colors and return the base color from the largest cluster. */
function getColor(sourceImage, quality) {
    var palette       = getPalette(sourceImage, 5, quality);
    var dominantColor = palette[0];
    return dominantColor;
}


/*
 * getPalette(sourceImage[, colorCount, quality])
 * returns array[ {r: num, g: num, b: num}, {r: num, g: num, b: num}, ...]
 *
 * Use the median cut algorithm provided by quantize.js to cluster similar colors.
 *
 * colorCount determines the size of the palette; the number of colors returned. If not set, it
 * defaults to 10.
 *
 * BUGGY: Function does not always return the requested amount of colors. It can be +/- 2.
 *
 * quality is an optional argument. It needs to be an integer. 0 is the highest quality settings.
 * 10 is the default. There is a trade-off between quality and speed. The bigger the number, the
 * faster the palette generation but the greater the likelihood that colors will be missed.
 *
 *
 */
function getPalette(sourceImageFilename, colorCount, quality ) {

    if (typeof colorCount === 'undefined') {
        colorCount = 10;
    }
    if (typeof quality === 'undefined') {
        quality = 10;
    }

  // Create custom CanvasImage object
    var image = new CanvasImage(sourceImageFilename),
        imageData = image.getImageData(),
        pixels = imageData.data,
        pixelCount = image.getPixelCount();

    // Store the RGB values in an array format suitable for quantize function
    var pixelArray = [];
    for (var i = 0, offset, r, g, b, a; i < pixelCount; i = i + quality) {
        offset = i * 4;
        r = pixels[offset + 0];
        g = pixels[offset + 1];
        b = pixels[offset + 2];
        a = pixels[offset + 3];
        // If pixel is mostly opaque and not white
        if (a >= 125) {
            if (!(r > 250 && g > 250 && b > 250)) {
                pixelArray.push([r, g, b]);
            }
        }
    }

    // Send array to quantize function which clusters values
    // using median cut algorithm
    var cmap    = MMCQ.quantize(pixelArray, colorCount);
    var palette = cmap.palette();

    // Clean up
    image.removeCanvas();

    return palette;
}


/*
 * createAreaBasedPalette(sourceImageFilename, colorCount)
 * returns array[ {r: num, g: num, b: num}, {r: num, g: num, b: num}, ...]
 *
 * Break the image into sections. Loops through pixel RGBS in the section and average color.
 * Tends to return muddy gray/brown color. You're most likely better off using createPalette().
 *
 * BUGGY: Function does not always return the requested amount of colors. It can be +/- 2.
 *
 */
function createAreaBasedPalette(sourceImageFilename, colorCount) {

    var palette = [];

    // Create custom CanvasImage object
    var image = new CanvasImage(sourceImageFilename),
        imageData = image.getImageData(),
        pixels = imageData.data,
        pixelCount = image.getPixelCount();


    // How big a pixel area does each palette color get
    var rowCount = Math.round(Math.sqrt(colorCount)),
        colCount = rowCount,
        colWidth = Math.round(image.width / colCount),
        rowHeight = Math.round(image.height / rowCount);

    // Loop through pixels section by section.
    // At the end of each section, push the average rgb color to palette array.
    for (var i = 0, vertOffset; i<rowCount; i++) {
        vertOffset = i * rowHeight * image.width * 4;

        for (var j = 0, horizOffset, rgb, count; j<colCount; j++) {
            horizOffset = j * colWidth * 4;
            rgb = {r:0, g:0, b:0};
            count = 0;

            for (var k = 0, rowOffset; k < rowHeight; k++) {
                rowOffset = k * image.width * 4;

                for (var l = 0, offset; l < colWidth; l++) {
                    offset = vertOffset + horizOffset + rowOffset + (l * 4);
                    rgb.r += pixels[offset];
                    rgb.g += pixels[offset+1];
                    rgb.b += pixels[offset+2];
                    count++;
                }

            }
            rgb.r = ~~(rgb.r/count);
            rgb.g = ~~(rgb.g/count);
            rgb.b = ~~(rgb.b/count);
            palette.push(rgb);
        }
    }

    return palette;
}


module.exports.getColor = getColor;
module.exports.getPalette = getPalette;
