class PostTextBox {
    // we 

    textColors = [
        color(255, 255, 255, 255), 
        color(255, 255, 255, 255), 
        color(255, 255, 255, 255), 
        color(255, 255, 255, 255)
    ];

    sizeRanges = [
        [30, 15],
        [15, 12],
        [11, 10],
        [8, 9]
    ];

    constructor(text, init_x, init_y, layer, target_words = []) {
        this.text = text;
        this.textColor = this.textColors[layer];
        this.highlightedTextColor = color(50, 227, 189);

        this.x = init_x;
        this.y = init_y;
        this.layer = layer;

        this.size = map(this.text.length, 0, 600, this.sizeRanges[layer][0], this.sizeRanges[layer][1]);
        this.targetWords = target_words;
        this.targetWordPositions = [];
        this.highlightedText = [];

        this.findTargetWords();

        this.speed = map(this.text.length, 0, 600, 2, 1);

        textSize(this.size);
        this.maxWidth = textWidth(this.text);
        console.log("Text: ", this.text, " Level: ", this.layer, " MaxWidth: ", this.maxWidth);
    }

    findTargetWords() {
        for (let targetWord of this.targetWords) {
            let index = this.text.toUpperCase().indexOf(targetWord.toUpperCase());
            this.targetWordPositions.push(index);
        }

        for (let i = 0; i < this.targetWordPositions.length; i++) {
            let targetWordPosition = this.targetWordPositions[i];
            if (targetWordPosition == -1) continue; // do we want to do something in this scenario?
            let targetWord = this.targetWords[i];
            let spaces = " ".repeat(targetWordPosition);
            let substring = this.text.substring(targetWordPosition, targetWordPosition + targetWord.length);
            this.highlightedText.push(spaces + substring);
        }
    }

    updatePosition() {
        this.x -= this.speed;
    }

    displayMainText(){
        textSize(this.size);
        
        fill(this.textColor);
        text(this.text, this.x, this.y);
    }

    displayHighlightedText() {
        fill(this.highlightedTextColor);
        textSize(this.size);
        for (let highlightedText of this.highlightedText) {
            fill(this.highlightedTextColor);
            text(highlightedText, this.x, this.y);
        }
    }

    isOffScreen() {
        return this.x + this.maxWidth < 0;
    }
}