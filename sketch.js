let img; 
let size;
let asciiChar = ["@", "#", "S", "%", "?", "*", "+", ";", ":", ",", "."];


function preload() {
  img = loadImage("tobias.jpg");

}

function setup() {
  createCanvas(720, 960);
  background(220); 
} 

function draw() {
  background(220);
  
   for (let i = 0; i<img.width; i++) {
    for (let j = 0; j<img.height; j++) {
      let pixelVal = img.get(i, j);
      let c = brightness(pixelval);
      let t = floormap(c, 0, 100, 0, asciiChar.length);

      let x = i*size;
      let y = j*size;
      text(t, x, y);


    }
  }
}