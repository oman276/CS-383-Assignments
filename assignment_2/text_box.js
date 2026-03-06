class PostTextBox {
  textColors = [
    color(255, 255, 255, 255),
    color(255, 255, 255, 150),
    color(255, 255, 255, 100),
    color(255, 255, 255, 100),
  ];

  sizeRanges = [
    [30, 15],
    [10, 10],
    [7, 7],
    [4, 4],
  ];

  speedRanges = [
    [2, 1],
    [0.5, 0.5],
    [0.25, 0.25],
    [0.1, 0.1],
  ];

  speedMultiplier = 0.2;

  constructor(text, init_x, init_y, layer, target_words = []) {
    this.text = text;
    this.textColor = this.textColors[layer];
    this.highlightedTextColor = color(0, 0, 0);

    this.x = init_x;
    this.y = init_y;
    this.layer = layer;

    this.size = map(
      this.text.length,
      0,
      600,
      this.sizeRanges[layer][0],
      this.sizeRanges[layer][1],
    );
    this.targetWords = target_words;
    this.targetWordPositions = [];
    this.highlightedText = [];

    this.findTargetWords();

    this.speed = map(
      this.text.length,
      0,
      600,
      this.speedRanges[layer][0],
      this.speedRanges[layer][1],
    );

    textSize(this.size);
    this.maxWidth = textWidth(this.text);
  }

  findTargetWords() {
    for (let targetWord of this.targetWords) {
      let index = this.text
        .toUpperCase()
        .indexOf(" " + targetWord.toUpperCase());
      this.targetWordPositions.push(index);
    }

    for (let i = 0; i < this.targetWordPositions.length; i++) {
      let targetWordPosition = this.targetWordPositions[i];
      if (targetWordPosition == -1) continue;
      let targetWord = this.targetWords[i];
      let spaces = " ".repeat(targetWordPosition);
      let substring = this.text.substring(
        targetWordPosition,
        targetWordPosition + targetWord.length + 1, // to account for searching for whitespace
      );
      this.highlightedText.push(spaces + substring);
    }
  }

  updatePosition(deltaTime) {
    this.x -= this.speed * deltaTime * this.speedMultiplier;
  }

  displayMainText() {
    textSize(this.size);
    textStyle(NORMAL);
    textAlign(LEFT, CENTER);
    fill(this.textColor);
    text(this.text, this.x, this.y);
  }

  displayHighlightedText() {
    fill(this.highlightedTextColor);
    textSize(this.size);
    textAlign(LEFT, CENTER);
    textStyle(BOLD);
    for (let highlightedText of this.highlightedText) {
      fill(this.highlightedTextColor);
      text(highlightedText, this.x, this.y);
    }
  }

  isOffScreen() {
    return this.x + this.maxWidth < 0;
  }
}
