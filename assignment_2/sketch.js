function preload() {}

let speechRec;
let audiotext;

let query;

let backgroundColorLight;
let backgroundColorDark;

let textBoxesToRender = [];
let cloudsLevel1 = [];
let cloudsLevel2 = [];
let cloudsLevel3 = [];

let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
let alphabetIndex = 0;

// cloud info
// start with a set number of clouds and then generate waaaaay fewer clouds
let min_time_between_clouds = 10000;
let max_time_between_clouds = 30000;
let cloudTimer = 0;
let lastCloudTime = 0;
let initialCloudCount = 7;

let cleanTime = 1000;
let lastCleanTime = 0;

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

  createCanvas(windowWidth, windowHeight);

  // define font data for everyone
  textFont('IBM Plex Mono');

  cloudTimer = random(min_time_between_clouds, max_time_between_clouds);
  for (let i = 0; i < initialCloudCount; i++) {
    generateCloud();
  }
}

function draw() {
  // do async updates before we draw to avoid any mid-draw updates
  let currentTime = millis();

  // update the clouds
  if (currentTime - lastCloudTime > cloudTimer) {
    generateCloud();
    lastCloudTime = currentTime;
    cloudTimer = random(min_time_between_clouds, max_time_between_clouds);
  }

  // clean up text boxes that are off screen (does not need to be each frame)
  if (currentTime - lastCleanTime > cleanTime) {
    textBoxesToRender = textBoxesToRender.filter((textBox) => !textBox.isOffScreen());
    cloudsLevel1 = cloudsLevel1.filter((textBox) => !textBox.isOffScreen());
    cloudsLevel2 = cloudsLevel2.filter((textBox) => !textBox.isOffScreen());
    cloudsLevel3 = cloudsLevel3.filter((textBox) => !textBox.isOffScreen());
    lastCleanTime = currentTime;
  }

  // get elements
  let backgroundColor = lerpColor(backgroundColorLight, backgroundColorDark, sin(frameCount * 0.005));

  // draw image on screen
  background(backgroundColor);

  cloudsLevel3.forEach((textBox) => {
    textBox.updatePosition();
    textBox.displayMainText()
  });

  cloudsLevel2.forEach((textBox) => {
    textBox.updatePosition();
    textBox.displayMainText()
  });

  cloudsLevel1.forEach((textBox) => {
    textBox.updatePosition();
    textBox.displayMainText()
  });

  textBoxesToRender.forEach((textBox) => {
    textBox.updatePosition();
    textBox.displayMainText()
  } );

  textBoxesToRender.forEach((textBox) => textBox.displayHighlightedText());
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

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
      query.query(word, 20).then((posts) => {
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
            random(div_range * i, div_range * (i + 1)), 
            0, // front layer
            [word]));
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

function generateCloud() {
  let layer = random([1, 2, 3]);
  let wordCount = int(random(5, 10));

  let char = alphabet[alphabetIndex];
  alphabetIndex = (alphabetIndex + 1) % alphabet.length;

  console.log("Generating cloud at layer ", layer, " with char ", char, " and word count ", wordCount);

  let baseHeight = random(0, windowHeight);

  query.firehose(char, wordCount).then((posts) => {
    posts.forEach((post) => {
      post.record.text = filterText(post.record.text);
      let box = new PostTextBox(post.record.text, 
        windowWidth + random(10, 50),
        baseHeight + random(-50, 50),
        layer, // layer
        []); // no target words
      
      if (layer == 1) { cloudsLevel1.push(box); }
      else if (layer == 2) { cloudsLevel2.push(box); }
      else { cloudsLevel3.push(box); }
    }); 
  });
}