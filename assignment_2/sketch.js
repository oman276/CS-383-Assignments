function preload() {}

let speechRec;
let audiotext;

let query;

function setup() {
  speechRec = new p5.SpeechRec("en-US", gotSpeech);
  audiotext = "";

  speechRec.start(true, false);

  // NOTE: You must fill in your credentials in config.js for this to work
  // Not sharing my own credentials on github. Get your own!
  query = new BlueskyQuery(BSKY_HANDLE, BSKY_PASSWORD);
  query.query("hello");
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
