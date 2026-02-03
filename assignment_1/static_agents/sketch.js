// parameters
let p = {
  // toggle filling screen or not
  fillScreen: true,

  // stroke weight
  weight: 1,
  weightMin: 0.5,
  weightMax: 32,

  // tile size
  tileSize: 10,
  tileSizeMin: 4,
  tileSizeMax: 128,

  // transform chance
  transformChance: 0.03,
  transformChanceMin: 0,
  transformChanceMax: 1,
  transformChanceStep: 0.001,

  // number of lines to be drawn on the screen
  lineNum : 5,
  lineNumMin : 1,
  lineNumMax : 10,

  // number of distinct midpoints per line
  lineMidpoints : 3,
  lineMidpointsMin : 1,
  lineMidpointsMax : 10,

  // max distance of each midpoint from the center line
  lineDivergence : 0.2,
  lineDivergenceMin : 0,
  lineDivergenceMax : 1,
  lineDivergenceStep : 0.01,

  activateEffect : false,

  seed: 1,
};

// list of agents
let agents;
let resetTimer = null;
let buffer;
let buffer_width = 600;
let buffer_height = 450;

let overlayImage;
let dialImage;
let switchImage;

let staticAudio;
const staticVolume = 0.1;
const staticFadeTime = 7.0;

let beepAudio;
const beepVolume = 0.2;
const beepFadeTime = 2.0;

let clickAudio;
const clickVolume = 0.3;

let buttonAudio;
const buttonVolume = 0.3;

let effectActive = false;

const controls = [
  { name: "dial1", x: -buffer_width/2 + 90,  y: buffer_height/2 + 30, radius: 32 },
  { name: "dial2", x: -buffer_width/2 + 250, y: buffer_height/2 + 30, radius: 32 },
  { name: "dial3", x: -buffer_width/2 + 410, y: buffer_height/2 + 30, radius: 32 },
  { name: "switch", x: buffer_width/2 - 75,  y: buffer_height/2 + 30, radius: 40 } 
];

let activeElement = null;

// view variables
baseZoom = 0.6;
activeZoom = 1;
currentZoom = baseZoom;

function preload() {
  overlayImage = loadImage('assets/w700.png');
  dialImage = loadImage('assets/dial_bw.png');
  switchImage = loadImage('assets/switch_darker.png');

  staticAudio = loadSound('assets/static_loop.flac');
  beepAudio = loadSound('assets/beep_loop.wav');
  clickAudio = loadSound('assets/click.wav');
  buttonAudio = loadSound('assets/button_press.mp3');
}

function setup() {
  randomSeed(p.seed);
  createCanvas(windowWidth, windowHeight, WEBGL);
  createSettingsGui(p, { callback: paramChanged, load: false });
  buffer = createGraphics(buffer_width, buffer_height, WEBGL);

  createAgents();

  frameRate(30);

  staticAudio.setVolume(staticVolume);
  beepAudio.setVolume(0);

  clickAudio.setVolume(clickVolume);
  clickAudio.playMode('untilDone');
  buttonAudio.setVolume(buttonVolume);
  buttonAudio.playMode('sustain');
  
  staticAudio.loop();
  beepAudio.loop();
}

function draw() {
  activeElement = null; 

  background(20);

  buffer.background('black');

  // update one agent at random
  let randomAgent = random(agents);
  randomAgent.update();

  // draw all the agents
  for (a of agents) {
    a.draw(buffer);
  }

  push();
  scale(currentZoom);
  imageMode(CENTER);
  
  //ambientLight(30); 
  spotLight(
    255, 255, 255,    
    0, -800, -70,     
    0, 1, -0.2,       
    PI / 4,
    40                 
  );

  //background box
  push();
  noStroke();
  translate(0, 0, -1);
  box(buffer_width, buffer_height, 2);
  pop();

  // floor 
  push();
  noStroke(); 
  ambientMaterial(20); 
  translate(0, 400, 0);
  rotateX(HALF_PI);
  plane(4000, 8000);
  pop();

  image(buffer, 0, 0);
  image(overlayImage, -10, 30);

  // dial 1
  push();
  translate(controls[0].x, controls[0].y);
  rotateZ( map(p.lineNum, p.lineNumMin, p.lineNumMax, -PI/2, PI/2) );
  image( dialImage, 0, 0, 64, 64);
  pop();

  // dial 2
  push();
  translate(controls[1].x, controls[1].y);
  rotateZ( map(p.lineMidpoints, p.lineMidpointsMin, p.lineMidpointsMax, -PI/2, PI/2) );
  image( dialImage, 0, 0, 64, 64);
  pop();

  // dial 3
  push();
  translate(controls[2].x, controls[2].y);
  rotateZ( map(p.lineDivergence, p.lineDivergenceMin, p.lineDivergenceMax, -PI/2, PI/2) );
  image( dialImage, 0, 0, 64, 64);
  pop();

  // switch
  push();
  translate(controls[3].x, controls[3].y);
  scale(0.5);
  image( switchImage, 0, 0);
  pop();

  pop();


  // detect where the mouse is, in relation to the zoom
  const mx = (mouseX - width / 2) / currentZoom;
  const my = (mouseY - height / 2) / currentZoom;

  // check each control for mouse overlap
  for (let control of controls){
    if (circleOverlapMouse(control.x, control.y, mx, my, control.radius * 2)){
      print("overlapping " + control.name);
      activeElement = control.name;
      break;
    }
  }
}

// create the grid of agents, one agent per grid location
function createAgents() {
  // setup the canvas
  if (p.fillScreen) {
    resizeCanvas(windowWidth, windowHeight);
  } else {
    resizeCanvas(600, 600);
  }

  agents = [];

  // tile spacing between agent centers
  const step = p.tileSize;

  // choose an integer grid size and center it in the canvas
  const cols = max(1, floor(buffer_width / step));
  const rows = max(1, floor(buffer_height / step));

  const gridW = cols * step;
  const gridH = rows * step;

  const startX = -gridW / 2 + step / 2;
  const startY = -gridH / 2 + step / 2;

  // create an Agent object and place it at centre of each tile
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = startX + i * step;
      const y = startY + j * step;
      let color = random(1) > 0.5 ? 'white' : 'black';
      agents.push(new StaticAgent(x, y, color));
    }
  }
}

function windowResized() {
  createAgents();
}

// global callback from the settings GUI
function paramChanged(name) {
  if (name == "tileSize" || name == "fillScreen") {
    createAgents();
  }
  if (name == "activateEffect"){
    if (!p.activateEffect) deactivateEffect();
    else activateEffect();
  }
}

function activateEffect(){
  print("activating effect");
  effectActive = true;

  gsap.to(this, {
    currentZoom: activeZoom,
    duration: 2,
    ease: "power2.inOut"
  });

  // we can pre-calculate agents per segment per line here
  // be careful to assign any leftover agents at the end to just be black for a bit
  const agentsPerSegment = floor(agents.length / (p.lineNum * (p.lineMidpoints + 1)));
  let availableAgents = [...agents];

  if (resetTimer){
    resetTimer.kill();
  }

  // define each line one at a time
  for (let i = 0; i < p.lineNum; i++){
    // pick two random endpoints on either: 
    let x1, y1, x2, y2;
    if (random(1) > 0.5){
      // the left and right edges of the screen
      x1 = -width/2;
      y1 = random(-height/2, height/2);
      x2 = width/2;
      y2 = random(-height/2, height/2);
    }
    else {
      // the top and bottom edges of the screen
      x1 = random(-width/2, width/2);
      y1 = -height/2;
      x2 = random(-width/2, width/2);
      y2 = height/2;
    }

    // define even spaced midpoints along the line
    // vary based on the midpoint randomness parameter 
    // (i'll probably need to scale this at some point later)
    let midpoints = [];
    for (let j = 0; j < p.lineMidpoints; j++){
      let mid_x = lerp(x1, x2, (j+1)/(p.lineMidpoints+1));
      let mid_y = lerp(y1, y2, (j+1)/(p.lineMidpoints+1));
      mid_x += (random(-p.lineDivergence, p.lineDivergence) * 200);
      mid_y += (random(-p.lineDivergence, p.lineDivergence) * 200);
      midpoints.push({x: mid_x, y: mid_y});
    }

    print("line %d:", i);
    print(x1, y1, x2, y2);
    print(midpoints);

    // grab random agents and set their target positions to random points along each
    // line segment defined by the endpoints and midpoints
    const linePoints = [{x: x1, y: y1}, {x: x1, y: y1}, ...midpoints, {x: x2, y: y2}, {x: x2, y: y2}];
    for (let k = 1; k < linePoints.length - 2; k++){
      const control1 = linePoints[k-1];
      const segStart = linePoints[k];
      const segEnd = linePoints[k+1];
      const control2 = linePoints[k+2];

      for (let m = 0; m < agentsPerSegment; m++){
        if (availableAgents.length == 0) break;
        const a = efficientRandomPop(availableAgents);
        const t = random(1);
        a.moveTo(curvePoint(control1.x, segStart.x, segEnd.x, control2.x, t),
                 curvePoint(control1.y, segStart.y, segEnd.y, control2.y, t), 
                 random(0.5, 1.5));
      }
    }
  }

  print(availableAgents.length + " agents left over");
  for (a of availableAgents){
    a.forceBlack();
  }
  resetTimer = gsap.delayedCall(5, deactivateEffect);

  beepAudio.setVolume(beepVolume, beepFadeTime); 
  staticAudio.setVolume(0, beepFadeTime);
}

function deactivateEffect(){
  if (!p.activateEffect) return;
  p.activateEffect = false;
  print("deactivating effect");
  if (resetTimer){
    resetTimer.kill();
    resetTimer = null;
  }

  // for all agents, assign them a random position 
  // agents will lerp back to original position in their update function
  for (a of agents){
    a.moveTo(a.ox, a.oy, random(2, 10));
  }

  gsap.to(window, {
    currentZoom: baseZoom,
    duration: 7,
    ease: "power2.inOut"
  });

  gsap.delayedCall(7, () => {
    effectActive = false;
  });

  beepAudio.setVolume(0, staticFadeTime);
  staticAudio.setVolume(staticVolume, staticFadeTime);
}

function efficientRandomPop(array) {
  const index = floor(random(array.length));
  const element = array[index];
  array[index] = array[array.length - 1];
  array.pop();
  return element;
}

function circleOverlapMouse(x, y, mx, my, d){
  let distance = dist(x, y, mx, my);
  return distance < d/2;
}

function mouseWheel(event) {
  if (activeElement == "dial1"){
    p.lineNum -= event.delta * 0.01;
    p.lineNum = constrain(p.lineNum, p.lineNumMin, p.lineNumMax);
    paramChanged("lineNum");
    clickAudio.play();
  }
  else if (activeElement == "dial2"){
    p.lineMidpoints -= event.delta * 0.01;
    p.lineMidpoints = constrain(p.lineMidpoints, p.lineMidpointsMin, p.lineMidpointsMax);
    paramChanged("lineMidpoints");
    clickAudio.play();
  }
  else if (activeElement == "dial3"){
    p.lineDivergence -= event.delta * 0.001;
    p.lineDivergence = constrain(p.lineDivergence, p.lineDivergenceMin, p.lineDivergenceMax);
    paramChanged("lineDivergence");
    clickAudio.play();
  }

}

function mousePressed(){
  userStartAudio();

  if (activeElement == "switch" && !effectActive){
    p.activateEffect = !p.activateEffect;
    if (p.activateEffect) {
      buttonAudio.play();
      activateEffect();
    } else {
      deactivateEffect();
    }
  }
}

function mouseMoved(){
}