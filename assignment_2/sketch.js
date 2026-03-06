function preload() {}

let speechRec;
let audiotext;

let query;

let backgroundColorLight;
let backgroundColorDark;
let currentBackgroundColor;

let textBoxesToRender = [];
let cloudsLevel1 = [];
let cloudsLevel2 = [];
let cloudsLevel3 = [];

let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
let alphabetIndex = 0;

// cloud info
// start with a set number of clouds and then generate waaaaay fewer clouds
let min_time_between_clouds = 3000;
let max_time_between_clouds = 8000;
let cloudTimer = 0;
let lastCloudTime = 0;
let initialCloudCount = 7;

let cleanTime = 1000;
let lastCleanTime = 0;

let isSpeaking = false;

let ambientLoopAudio;
const ambientLoopVolume = 0.1;

let maxItemsStaggered = 10;

let hasSpokenAtAll = false;
let introTextAlpha = 255;

function preload() {
  ambientLoopAudio = loadSound("audio/outside_loop.wav");
}

function setup() {
  speechRec = new p5.SpeechRec("en-US", gotSpeechResult);
  audiotext = "";

  speechRec.continuous = true;
  speechRec.interimResults = true;
  speechRec.start();

  speechRec.onEnd = () => {
    speechRec.start();
  };

  // NOTE: You must fill in your credentials in config.js for this to work
  // Not sharing my own credentials on github. Get your own!
  query = new BlueskyQuery(BSKY_HANDLE, BSKY_PASSWORD);

  backgroundColorLight = color(108, 167, 240);
  backgroundColorDark = color(80, 155, 242);

  currentBackgroundColor = backgroundColorDark;

  createCanvas(windowWidth, windowHeight);

  // define font data for all subsequent text rendering
  // ie: we dont need to define in the PostTextBox class
  textFont("IBM Plex Mono");

  cloudTimer = random(min_time_between_clouds, max_time_between_clouds);
  for (let i = 0; i < initialCloudCount; i++) {
    generateCloud();
  }

  ambientLoopAudio.setVolume(ambientLoopVolume);
  ambientLoopAudio.loop();
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
    textBoxesToRender = textBoxesToRender.filter(
      (textBox) => !textBox.isOffScreen(),
    );
    cloudsLevel1 = cloudsLevel1.filter((textBox) => !textBox.isOffScreen());
    cloudsLevel2 = cloudsLevel2.filter((textBox) => !textBox.isOffScreen());
    cloudsLevel3 = cloudsLevel3.filter((textBox) => !textBox.isOffScreen());
    lastCleanTime = currentTime;
  }

  let targetBackgroundColor = isSpeaking
    ? backgroundColorLight
    : backgroundColorDark;

  currentBackgroundColor = lerpColor(
    currentBackgroundColor,
    targetBackgroundColor,
    0.01 * deltaTime,
  );

  // draw image on screen
  background(currentBackgroundColor);

  cloudsLevel3.forEach((textBox) => {
    textBox.updatePosition(deltaTime);
    textBox.displayMainText();
  });

  cloudsLevel2.forEach((textBox) => {
    textBox.updatePosition(deltaTime);
    textBox.displayMainText();
  });

  cloudsLevel1.forEach((textBox) => {
    textBox.updatePosition(deltaTime);
    textBox.displayMainText();
  });

  textBoxesToRender.forEach((textBox) => {
    textBox.updatePosition(deltaTime);
    textBox.displayMainText();
  });

  textBoxesToRender.forEach((textBox) => textBox.displayHighlightedText());

  if (!hasSpokenAtAll || introTextAlpha > 0) {
    textSize(30);
    textStyle(NORMAL);
    textAlign(CENTER, CENTER);
    fill(255, 255, 255, introTextAlpha);
    text("What's on your mind?", windowWidth / 2, windowHeight / 2);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function paramChanged(name) {}

function gotSpeechResult() {
  if (!speechRec.resultValue) return;
  if (!speechRec.resultString) return;

  if (!hasSpokenAtAll) {
    hasSpokenAtAll = true;
    gsap.to(
      { alpha: introTextAlpha },
      {
        alpha: 0,
        duration: 1,
        onUpdate: function () {
          introTextAlpha = this.targets()[0].alpha;
        },
      },
    );
  }

  isSpeaking = true;

  if (speechRec.resultConfidence <= 0.9) return;
  console.log("confidence: ", speechRec.resultConfidence);

  // split the result here so we only need to do it once
  let result = speechRec.resultString.split(" ");

  gotSpeech(result);
}

function gotSpeech(result) {
  if (result) {
    let subsetWords = result.slice(0, maxItemsStaggered);
    let word_num = subsetWords.length;
    let div_range = windowHeight / word_num;

    for (let i = 0; i < subsetWords.length; i++) {
      let word = subsetWords[i];
      let delay = i * 300;
      setTimeout(
        () =>
          query.query(word, 20).then((posts) => {
            let shortestPosition = Infinity;
            let shortestPostIndex = -1;
            for (let j = 0; j < posts.length; j++) {
              let post = posts[j];
              post.record.text = filterText(post.record.text);
              let position = post.record.text
                .toUpperCase()
                .indexOf(" " + word.toUpperCase());

              if (position != -1 && position < shortestPosition) {
                shortestPosition = position;
                shortestPostIndex = j;
              }
            }
            if (shortestPostIndex == -1) return; // do we want to do something in this scenario?
            let post = posts[shortestPostIndex];
            textBoxesToRender.push(
              new PostTextBox(
                filterText(post.record.text, shortestPosition),
                windowWidth,
                random(
                  max(40, div_range * i),
                  min(div_range * (i + 1), windowHeight - 40),
                ),
                0, // front layer
                [word],
              ),
            );
            isSpeaking = false;
          }),
        delay,
      );
    }

    setTimeout(
      () => {
        gotSpeech(result.slice(maxItemsStaggered));
      },
      subsetWords.length * 300 + 2000,
    ); // add some extra time after the last word
  }
}

function filterText(text, wordPosition = -1) {
  text = text.replace(/\n/g, " ");
  text = text.replace(/\p{Extended_Pictographic}/gu, "");

  // trim out all sentences after the end of the first sentence with the target word
  if (wordPosition != -1) {
    let endings = [
      text.indexOf(".", wordPosition),
      text.indexOf("!", wordPosition),
      text.indexOf("?", wordPosition),
      text.indexOf(" www.", wordPosition),
      text.indexOf(" http", wordPosition),
    ].filter((i) => i !== -1);
    let sentenceEnd = endings.length > 0 ? min(...endings) : -1;
    if (sentenceEnd != -1) {
      text = text.substring(0, sentenceEnd + 1);
    }
  }

  text = " " + text + " "; // add some padding to help find the position of the actual substring more accurately

  return text;
}

function generateCloud() {
  let layer = random([1, 2, 3]);
  let wordCount = int(random(5, 10));

  let char = alphabet[alphabetIndex];
  alphabetIndex = (alphabetIndex + 1) % alphabet.length;
  let baseHeight = random(0, windowHeight);

  query.query(char, wordCount).then((posts) => {
    posts.forEach((post) => {
      post.record.text = filterText(post.record.text);
      let box = new PostTextBox(
        post.record.text,
        windowWidth + random(10, 50),
        baseHeight + random(-50, 50),
        layer,
        [],
      ); // no target words for this one

      if (layer == 1) {
        cloudsLevel1.push(box);
      } else if (layer == 2) {
        cloudsLevel2.push(box);
      } else {
        cloudsLevel3.push(box);
      }
    });
  });
}
