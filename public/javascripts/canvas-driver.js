/**
 * Global variables and constants
 */
var canvas, c;
var mCanvas, mC;
const picDir = '/data/pictures/';
var currImg;
var shouldDraw = false;
var startX = 0;
var startY = 0;
var endX = 0;
var endY = 0;
var output = {};
var trash = [];

/**
 * Event handlers
 */
window.onload = function() {
    console.log('I/canvas: onload');
    canvas = document.getElementById('selection-layer');
    c = canvas.getContext('2d');
    resizeCanvas(c);

    mCanvas = document.getElementById('main-layer');
    mC = mCanvas.getContext('2d');
    resizeCanvas(mC);

    c.strokeStyle = "red";
    c.fillStyle = "blue";
    c.globalAlpha = 0.5;
    mC.strokeStyle = "green";
    console.log('I/canvas: Both canvases ready');
    // custom event triggered after image is rendered on main canvas
    mCanvas.addEventListener('imageRendered', redrawBBs);
    console.log('I/canvas: imageRendered event added');
    renderImage(mCanvas);

    console.log('I/canvas: image rendered');
    canvas.onmousedown = mouseHold;
    canvas.onmousemove = mouseMove;
    canvas.onmouseup = mouseRelease;

    /**
     * Handle clicks
     */
    document.getElementById("bb-save-btn").onclick = saveItem;
    document.getElementById("tb-next").onclick = nextImage;
    document.getElementById("tb-previous").onclick = previousImage;
    document.getElementById("tb-save-all").onclick = saveAll;
    document.getElementById("tb-discard-all").onclick = discardAll;
    document.getElementById("tb-undo").onclick = undo;
    document.getElementById("tb-redo").onclick = redo;

    /**
     * Handle text change. Page will reload with new params
     * defined by changed text
     */
    document.getElementById("data-classname").onchange = onClassChange;

    /**
     * Clear text on focus for easier selection of next item
     */
    document.getElementById("data-classname").onfocus = function() {
        this.value = "";
    };
    var labelInps = document.getElementsByClassName("data-label-value");
    for (var i = 0; i < labelInps.length; i++) {
        labelInps[i].onfocus = function() {
            this.value = "";
        }
    }
}


function saveItem() {
    saveBB(startX, startY, endX - startX, endY - startY);
    console.log('saveItem: start saving');
    var classname = getCurrClass();
    var labels = getLabels();
    scale = {
        width: document.getElementById('canvas-holder').clientWidth,
        height: document.getElementById('canvas-holder').clientHeight
    };
    var item = {
        location: {
            startX: startX,
            startY: startY,
            endX: endX,
            endY: endY
        },

        classname: classname,
        labels: labels
    }
    item = normalizeBox(item, scale);
    output.annotes.push(item);
    console.log('output:', JSON.stringify(output, null, 4));
    console.log('saveItem: end saving');
    var jsonViewer = document.getElementById('json-viewer');
    jsonViewer.value = JSON.stringify(output);
    saveAll();
}


function renderImage(target) {
    console.log('rendering image');
    var event = new Event('imageRendered');
    var image = new Image();
    currImg = {
        name: document.getElementById('img-name').innerHTML,
        width:  parseInt(document.getElementById('img-true-w').innerHTML),
        height: parseInt(document.getElementById('img-true-h').innerHTML)
    }

    if(typeof currImg.name != 'undefined') {
        image.src = picDir + currImg.name;

        image.onload = function() {
            mC.drawImage(image, 0, 0, currImg.width, currImg.height,
                                0, 0, mC.canvas.width, mC.canvas.height);

            target.dispatchEvent(event);
            console.log('Image rendered successfully');
            console.log(`I/canvas: Height: ${mCanvas.height} Width: ${mCanvas.width}`);

        };
    }

}



function mouseHold(event) {
    shouldDraw = true;
    var pos = getMousePos(event);
    startX = pos.x;
    startY = pos.y;
    console.log(`currX ${startX} currY ${startY}`);
}


function mouseMove(event) {
    var prevX = 0;
    var prevY = 0;
    var pos = getMousePos(event);
    if(shouldDraw) {
       endX =  pos.x;
       endY = pos.y;
       //console.log(`posx ${pos.x} posy ${pos.y}`);
       drawSelection(startX, startY, endX - startX, endY - startY);
       showBBInfo();
    }

    withinTheBB(pos, output.annotes);

}

function withinTheBB(currentPos,listOfBB){
  for( var i = 0; i < listOfBB.length; i++ ){
    scale = {
        width: document.getElementById('canvas-holder').clientWidth,
        height: document.getElementById('canvas-holder').clientHeight
    };
    var obj = listOfBB[i];
    var loc = denormalizeBox(obj, scale);

    if(ifWithinTheBB(currentPos,obj,scale)){
      x = loc.startX;
      y = loc.startY;
      w = loc.endX - x;
      h = loc.endY - y;
      drawSelection(x, y, w, h);
      //listOfBB.remove(i);
    }
  }
}


function ifWithinTheBB(pos, item, scale ){
  var boundingBoxStartX = item.location.startX;
  var boundingBoxStartY = item.location.startY;
  var boundingBoxEndX = item.location.endX;
  var boundingBoxEndY = item.location.endY;
  if(pos.x >= boundingBoxStartX && pos.x <= boundingBoxEndX)
  {
    if(pos.y >= boundingBoxStartY && pos.y <= boundingBoxEndY)
    {
      //console.log(" within the box, caught ya! ");
      return true;
    }
    else {
      return false;
    }
  }
  else {
    return false;
  }
}


function mouseRelease(event) {
    shouldDraw = false;
    var pos = getMousePos(event);
    endX =  pos.x;
    endY = pos.y;
    console.log(`posx ${pos.x} posy ${pos.y}`);
    drawBB(startX, startY, endX - startX, endY - startY);
    showBBInfo();
}


function showBBInfo(){
    document.getElementById('bb-start-x').innerHTML = startX;
    document.getElementById('bb-start-y').innerHTML = startY;
    document.getElementById('bb-end-x').innerHTML = endX;
    document.getElementById('bb-end-y').innerHTML = endY;
    document.getElementById('bb-width').innerHTML = Math.abs(endX - startX);
    document.getElementById('bb-height').innerHTML = Math.abs(endY - startY);
}


function drawSelection(x, y, w, h) {
    clearCanvas(c);
    c.fillRect(x, y, w, h);
}


function drawBB(x, y, w, h) {
    clearCanvas(c);
    c.globalAlpha = 1;
    c.rect(x, y, w, h);
    c.stroke();
    c.globalAlpha = 0.5;
}


function saveBB(x, y, w, h) {
    clearCanvas(c);
    mC.rect(x, y, w, h);
    mC.stroke();
}


function clearCanvas(context) {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    context.beginPath();
}


function getMousePos(event) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
}


function getCurrClass() {
    var classname = document.getElementById('data-classname').value;
}


function getLabels() {
    var labels = [];
    var labelNodes = document.getElementsByName('label-container');
    for(var i = 0; i < labelNodes.length; i++) {
        var name = labelNodes[i].getElementsByClassName('data-label-name')[0].innerHTML;
        var val = labelNodes[i].getElementsByClassName('data-label-value')[0].value;
        if (val == "") {
            val = null;
        }
        label = {
            name: name,
            value: val
        }
        labels.push(label);
    }
    return labels;
}


function redrawBBs() {
    output = {
        filename: currImg.name,
        ogSize: {
            width: currImg.width,
            height: currImg.height
        },
        annotes: []
    };
    var jsonStr = document.getElementById('json-viewer').value;
    if(jsonStr == "") {
        document.getElementById('json-viewer').value = JSON.stringify(output);
    }
    var data;
    try {
        data = JSON.parse(jsonStr);
        if (data.hasOwnProperty('filename') && data.hasOwnProperty('annotes')) {
            output = data;
        }
    } catch (error) {
        console.log('E/onResume:', error);
    }

    if(currImg.name != output.filename) return false;

    if(Array.isArray(output.annotes) && typeof output.annotes != 'undefined'){
        scale = {
            width: document.getElementById('canvas-holder').clientWidth,
            height: document.getElementById('canvas-holder').clientHeight
        };
        for(var i = 0; i < output.annotes.length; i++) {
            var bb = denormalizeBox(output.annotes[i], scale);

            console.log('I/onResume: redrawing canvas...');
            if(typeof bb != 'undefined'){
                saveBB(bb.startX, bb.startY,
                       bb.endX - bb.startX, bb.endY - bb.startY);
            }
        }
    }
    return true;
}


function nextImage() {
    window.location.href = "/gallery/next-image";
    return true; // to satisfy a bug in chrome
}


function previousImage() {
    window.location.href = "/gallery/previous-image";
    return true; // to satisfy a bug in chrome
}


function saveAll(){
    $("#submit-save-all").click();
}


function discardAll() {
    output.annotes = [];
    document.getElementById('json-viewer').value = JSON.stringify(output);
    clearCanvas(mC);
    renderImage(mCanvas);
}


function onClassChange() {
    var classname = document.getElementById('data-classname').value;
    window.location.href = "/gallery/" + classname;
}


function undo() {
    if (output.annotes.length > 0) {
        trash.push(output.annotes.pop());
        document.getElementById('json-viewer').value = JSON.stringify(output);
        clearCanvas(mC);
        renderImage(mCanvas);
    }
}

function redo() {
    if(trash.length > 0) {
        output.annotes.push(trash.pop());
        document.getElementById('json-viewer').value = JSON.stringify(output);
        clearCanvas(mC);
        renderImage(mCanvas);
    }
}

function resizeCanvas(context) {
    context.canvas.width = document.getElementById("canvas-holder").offsetWidth;
    context.canvas.height = document.getElementById("canvas-holder").offsetHeight;
}


function normalizeBox(item, scale) {
    var location = JSON.parse(JSON.stringify(item.location)); //deep copy
    var W = currImg.width/scale.width;
    var H = currImg.height/scale.height;
    item.location.startX = Math.round(location.startX * W);
    item.location.startY = Math.round(location.startY * H);
    item.location.endX = Math.round(location.endX * W);
    item.location.endY = Math.round(location.endY * H);

    return item;
}


function denormalizeBox(item, scale) {

    var location = JSON.parse(JSON.stringify(item.location)); //deep copy
    var W = scale.width/currImg.width;
    var H = scale.height/currImg.height;
    console.log('denormalize scale',W, H);
    location.startX = Math.round(item.location.startX*W);
    location.startY = Math.round(item.location.startY*H);
    location.endX = Math.round(item.location.endX*W);
    location.endY = Math.round(item.location.endY*H);
    console.log('denormalize', JSON.stringify(location));
    return location;
}
