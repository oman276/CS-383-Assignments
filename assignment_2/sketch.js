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
  speechRec.interimResults = false; // tried, but didn't work like I wanted it to
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

    // TODO we probably want this to cycle globally rather than per cycle if we're making this continuous
    for (let i = 0; i < words.length; i++) {
      let word = words[i];
      query.query(word, 10).then((posts) => {
        let shortestPosition = Infinity;
        let shortestPostIndex = -1;
        for (let j = 0; j < posts.length; j++) {
          let post = posts[j];
          post.record.text = filterText(post.record.text);
          let position = post.record.text.toUpperCase().indexOf(word.toUpperCase());

          if (position != -1 && position < shortestPosition) {
            shortestPosition = position;
            shortestPostIndex = j;
          }
        }
        if (shortestPostIndex == -1) return; // do we want to do something in this scenario?
        let post = posts[shortestPostIndex];
        textBoxesToRender.push(new PostTextBox(post.record.text, 
            windowWidth + random(10, 50), 
            random(div_range * i, div_range * (i + 1)), [word]));
      });
    }
  }
}

function filterText(text){
  // remove newlines
  text = text.replace(/\n/g, " ");
  // remove emojis
  text = text.replace(/\p{Extended_Pictographic}/gu, '');
  return text;
}
