function preload() {}

let speechRec;
let audiotext;

function setup() {
  speechRec = new p5.SpeechRec("en-US", gotSpeech);
  audiotext = "";

  speechRec.start(true, false);
}

function draw() {
  createCanvas(400, 400);
  background(40);
  textSize(30);
  fill(255);
  textColor = color(255, 0, 0);
  text(audiotext, 50, 50);
}

function windowResized() {}

function paramChanged(name) {}

function gotSpeech() {
  if (speechRec.resultValue) {
    console.log(speechRec.resultString);
    audiotext = speechRec.resultString;
    // text(speechRec.resultString, 50, 100);
  }
}
