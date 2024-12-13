import { GameObjects, Scene } from "phaser";

import { EventBus } from "../EventBus";

const CARD_SCALE = 2;
const CARD_WIDTH = 72;
const CARD_HEIGHT = 96;

enum CardSuit {
    CLUBS = 0,
    SPADES = 1,
    HEARTS = 2,
    DIAMONDS = 3,
}
const FACE_DOWN_FRAME = 13;

class Card extends Phaser.GameObjects.Sprite {
    private faceFrame: number;
    private isFaceDown: boolean;
    private flipTween?: Phaser.Tweens.Tween;
    private moveToTween?: Phaser.Tweens.Tween;

    public currentlyInCollection?: CardCollection;

    // For value, 1 = ace ... 13 = king
    constructor(
        scene: Scene,
        x: number,
        y: number,
        public readonly suit: CardSuit,
        public readonly value: number,
        isFaceDown: boolean
    ) {
        if (value <= 0 || value > 14) {
            console.error("Invalid card value", value);
            value = 1;
        }

        let fr = suit * 14 + (value - 1);
        super(scene, x, y, "card", isFaceDown ? FACE_DOWN_FRAME : fr);

        this.faceFrame = fr;

        this.isFaceDown = isFaceDown;

        this.on("dragstart", () => {
            // this.scale = CARD_SCALE + 0.5;
            this.depth = 100;
            this.setFaceDown(false);
        });
        this.on("drag", (_ev: any, x: number, y: number) => {
            this.x = x;
            this.y = y;
        });
        this.on("dragend", () => {
            // this.scale = CARD_SCALE;
            this.depth = 1;
            this.setFaceDown(true);
        });

        this.setScale(CARD_SCALE);
        this.setDepth(1);
        this.setInteractive({
            draggable: true,
        } as Phaser.Types.Input.InputConfiguration);
    }

    setFaceDown(faceDown: boolean) {
        if (this.isFaceDown == faceDown) return;

        if (this.flipTween && this.flipTween.isActive()) {
            this.flipTween.stop();
        }
        this.flipTween = this.scene.tweens.add({
            targets: this,
            duration: 100,
            scaleX: 0,
            yoyo: true,
            ease: Phaser.Math.Easing.Circular.InOut,
            onYoyo: () => {
                this.setFrame(faceDown ? FACE_DOWN_FRAME : this.faceFrame);
            },
            onComplete: () => {
                this.scale = CARD_SCALE;
            },
        });
        this.isFaceDown = faceDown;
    }

    moveTo(x: number, y: number, angle: number, delay = 0) {
        if (this.moveToTween && this.moveToTween.isActive()) {
            this.moveToTween.stop();
        }
        this.moveToTween = this.scene.tweens.add({
            targets: this,
            duration: 300,
            x: x,
            y: y,
            delay: delay,
            angle: angle,
            ease: Phaser.Math.Easing.Cubic.Out,
        });
    }
}

export class CardCollection {
    cards: Card[];
    spacing = 50;

    constructor(public x: number, public y: number, public angle: number) {
        this.cards = [];
    }

    addCard(card: Card) {
        this.cards.push(card);

        if (card.currentlyInCollection) {
            let idx = card.currentlyInCollection.cards.indexOf(card);
            if (idx < 0) {
                console.error(
                    "Card removed from collection but not found in cards array"
                );
            } else {
                card.currentlyInCollection.cards.splice(idx, 1);
            }
        }
        card.currentlyInCollection = this;

        this.updateCardPositions();
    }

    private updateCardPositions() {
        for (let i = 0; i < this.cards.length; i++) {
            let card = this.cards[i];
            card.moveTo(
                this.x +
                    i * this.spacing -
                    (this.cards.length * this.spacing) / 2,
                this.y,
                this.angle
            );
            card.setDepth(10 + i);
        }
    }
}

export class Player {
    constructor(private scene: Scene) {}
}

export class GameScene extends Scene {
    currentlyDragging!: Phaser.GameObjects.Sprite;
    testKey: Phaser.Input.Keyboard.Key;

    collection: CardCollection;

    constructor() {
        super("GameScene");
    }

    preload() {
        this.load.spritesheet("card", "assets/cards.png", {
            frameWidth: CARD_WIDTH,
            frameHeight: CARD_HEIGHT,
        });
    }

    create() {
        // this.testKey = this.input.keyboard!.addKey(
        //     Phaser.Input.Keyboard.KeyCodes.A
        // );
        // this.testKey.on("keydown", () => {
        //     console.log("keydown");
        // });

        this.collection = new CardCollection(
            window.innerWidth / 2,
            window.innerHeight - 100,
            0
        );

        let counter = 0;

        this.input.keyboard!.on("keydown-A", () => {
            let card = new Card(
                this,
                100,
                100,
                Math.floor(counter / 13),
                (counter % 13) + 1,
                false
            );

            this.children.add(card);
            this.collection.addCard(card);
            counter++;
        });

        // this.add.sprite(30, 60, "card", 10);

        let title = this.add
            .text(512, 460, "Main Menu", {
                fontFamily: "Arial Black",
                fontSize: 38,
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 8,
                align: "center",
            })
            .setOrigin(0.5)
            .setDepth(100);

        EventBus.emit("current-scene-ready", this);
    }

    update(time: number, delta: number): void {
        // console.log("update");
        super.update(time, delta);
    }
}

