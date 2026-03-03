class PostTextBox {
    constructor(text, init_x, init_y, target_words = []) {
        console.log("CREATING POST TEXT BOX WITH TEXT: ", text);
        this.text = text;
        this.textColor = color(255, 255, 255);
        this.highlightedTextColor = color(50, 227, 189);

        this.x = init_x;
        this.y = init_y;

        this.textWrapWidth = random(500, 700);
        this.size = random(15, 30)
        this.targetWords = target_words;
        this.targetWordPositions = [];
        this.highlightedText = [];

        this.findTargetWords();
    }

    findTargetWords() {
        for (let targetWord of this.targetWords) {
            // possible formatting check?
            let index = this.text.toUpperCase().indexOf(targetWord.toUpperCase());
            this.targetWordPositions.push(index);
        }

        for (let i = 0; i < this.targetWordPositions.length; i++) {
            let targetWordPosition = this.targetWordPositions[i];
            if (targetWordPosition == -1) continue;
            let targetWord = this.targetWords[i];
            let spaces = " ".repeat(targetWordPosition);
            this.highlightedText.push(spaces + targetWord);
        }
    }

    updatePosition() {
    }

    display(){
        textSize(this.size);
        textWrap(WORD);
        textFont('IBM Plex Mono');

        fill(this.textColor);
        text(this.text, this.x, this.y, this.textWrapWidth);
        for (let highlightedText of this.highlightedText) {
            console.log("HIGHLIGHTED TEXT: ", highlightedText);
            fill(this.highlightedTextColor);
            text(highlightedText, this.x, this.y, this.textWrapWidth);
        }
    }
}