class PostTextBox {
    constructor(text, init_x, init_y, target_words = []) {
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
            let index = this.text.indexOf(targetWord);
            this.targetWordPositions.push(index);
        }

        for (let i = 0; i < this.targetWordPositions.length; i++) {
            let targetWordPosition = this.targetWordPositions[i];
            if (targetWordPosition == -1) continue;
            let targetWord = this.targetWords[i];
            this.highlightedText.push(targetWord);
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

        for (let i = 0; i < this.targetWordPositions.length; i++) {
            let targetWord = this.targetWords[i];
            let targetWordPosition = this.targetWordPositions[i];
        }
    }
}