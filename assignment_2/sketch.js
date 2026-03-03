function preload() {}

let speechRec;
let audiotext;

let query;

let backgroundColorLight;
let backgroundColorDark;

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

  // define font data for everyone
  textFont('IBM Plex Mono');
}

function draw() {
  // get elements
  let backgroundColor = lerpColor(backgroundColorLight, backgroundColorDark, sin(frameCount * 0.005));

  // draw image on screen
  createCanvas(windowWidth, windowHeight);
  background(backgroundColor);

  textBoxesToRender = textBoxesToRender.filter((textBox) => !textBox.isOffScreen());
  textBoxesToRender.forEach((textBox) => textBox.updatePosition());
  textBoxesToRender.forEach((textBox) => textBox.displayMainText());
  textBoxesToRender.forEach((textBox) => textBox.displayHighlightedText());
  console.log(textBoxesToRender.length, " text boxes rendering");
}

function windowResized() {}

function paramChanged(name) {}

function gotSpeech() {
  if (speechRec.resultValue) {
    console.log(speechRec.resultString);
    audiotext = speechRec.resultString;
    let words = audiotext.split(" ");
    let word_num = words.length;
    let div_range = windowHeight / word_num;

    for (let i = 0; i < words.length; i++) {
      let word = words[i];
      query.query(word, 1).then((posts) => {
        for (let post of posts) {
          textBoxesToRender.push(new PostTextBox(post.record.text, 
            windowWidth + random(10, 50), 
            random(div_range * i, div_range * (i + 1)), [word]));
        }
      });
    }
  }
}
