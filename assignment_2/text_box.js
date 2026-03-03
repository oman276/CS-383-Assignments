class PostTextBox {
    constructor(text, init_x, init_y, target_words = []) {
        // console.log("CREATING POST TEXT BOX WITH TEXT: ", text);
        this.text = text;
        this.textColor = color(255, 255, 255);
        this.highlightedTextColor = color(50, 227, 189);

        this.x = init_x;
        this.y = init_y;

        this.size = map(this.text.length, 0, 300, 30, 15);
        this.targetWords = target_words;
        this.targetWordPositions = [];
        this.highlightedText = [];

        this.findTargetWords();

        this.speed = map(this.text.length, 0, 300, 2, 1);

        // We'll do any filtering in the space above
        this.maxWidth = textWidth(this.text);
    }


    // bug: this doesn't account for newlines in the text
    // we might need to do a loop through of the text and construct in place
    // which is probably how this works under the hood anyways
    findTargetWords() {
        for (let targetWord of this.targetWords) {
            let index = this.text.toUpperCase().indexOf(" " + targetWord.toUpperCase() + " ");
            this.targetWordPositions.push(index);
        }

        for (let i = 0; i < this.targetWordPositions.length; i++) {
            let targetWordPosition = this.targetWordPositions[i];
            if (targetWordPosition == -1) continue; // do we want to do something in this scenario?
            let targetWord = this.targetWords[i];
            let spaces = " ".repeat(targetWordPosition - 1);
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