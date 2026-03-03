function preload() {}

let speechRec;
let audiotext;

let query;

let backgroundColorLight;
let backgroundColorDark;

// test version, at some point this will have to be an array I guess
let textBoxToRender;
let textBoxesToRender = [];

function setup() {
  speechRec = new p5.SpeechRec("en-US", gotSpeech);
  audiotext = "";

  speechRec.continuous = true;
  speechRec.interimResults = false;
  speechRec.start();

  speechRec.onEnd = () => {
    speechRec.start();
  };

  // NOTE: You must fill in your credentials in config.js for this to work
  // Not sharing my own credentials on github. Get your own!
  query = new BlueskyQuery(BSKY_HANDLE, BSKY_PASSWORD);

  // define the colors
  backgroundColorLight = color(108, 167, 240);
  backgroundColorDark = color(39, 98, 168);
}

function draw() {
  // get elements
  let backgroundColor = lerpColor(backgroundColorLight, backgroundColorDark, sin(frameCount * 0.005));

  // draw image on screen
  createCanvas(windowWidth, windowHeight);
  background(backgroundColor);

  // load text boxes
  for (let textBox of textBoxesToRender) {
    textBox.display();
  }
}

function windowResized() {}

function paramChanged(name) {}

function gotSpeech() {
  if (speechRec.resultValue) {
    console.log(speechRec.resultString);
    audiotext = speechRec.resultString;
    let words = audiotext.split(" ");
    for (let word of words) {
      query.query(word, 1).then((posts) => {
        for (let post of posts) {
          // console.log("QUERY FOR ", word, " - ", post.record.text);
          textBoxesToRender.push(new PostTextBox(post.record.text, random(50, 500), random(50, 500), [word]));
        }
      });
    }
  }
}
