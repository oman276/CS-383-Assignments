function preload() {}

let speechRec;
let audiotext;

let query;

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
  // query
  //   .query("hello", 5)
  //   .then((posts) => {
  //     for (let post of posts) {
  //       console.log(post.record.text);
  //     }
  //   })
  //   .catch((error) => {
  //     console.error("Error querying posts:", error);
  //   });
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
    let words = audiotext.split(" ");
    for (let word of words) {
      query.query(word, 1).then((posts) => {
        for (let post of posts) {
          console.log("QUERY FOR ", word, " - ", post.record.text);
        }
      });
    }
  }
}
