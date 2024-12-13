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
            onYoyo: () => {
                this.setFrame(faceDown ? FACE_DOWN_FRAME : this.faceFrame);
            },
            onComplete: () => {
                this.scale = CARD_SCALE;
            },
        });
        this.isFaceDown = faceDown;
    }
}

export class Player {
    constructor(private scene: Scene) {}
}

export class GameScene extends Scene {
    currentlyDragging!: Phaser.GameObjects.Sprite;

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
        for (let i = 0; i < 8; i++) {
            let card = new Card(
                this,
                100 + i * CARD_WIDTH * CARD_SCALE,
                100,
                CardSuit.DIAMONDS,
                i + 1,
                i % 2 == 0
            )
                .setScale(CARD_SCALE)
                .setDepth(1)
                .setInteractive({
                    draggable: true,
                } as Phaser.Types.Input.InputConfiguration);
            this.children.add(card);
            // card.setFaceDown();
        }
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

