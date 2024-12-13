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

class Card extends Phaser.GameObjects.Sprite {
    // For value, 1 = ace ... 13 = king
    constructor(
        scene: Scene,
        x: number,
        y: number,
        public readonly suit: CardSuit,
        public readonly value: number
    ) {
        if (value <= 0 || value > 14) {
            console.error("Invalid card value", value);
            value = 1;
        }

        super(scene, x, y, "card", suit * 14 + (value - 1));

        this.on("dragstart", () => {
            this.scale = CARD_SCALE + 0.5;
            this.depth = 100;
        });
        this.on("drag", (_ev: any, x: number, y: number) => {
            this.x = x;
            this.y = y;
        });
        this.on("dragend", () => {
            this.scale = CARD_SCALE;
            this.depth = 1;
        });
    }

    update(...args: any[]): void {
        console.log("card udpateoj");
    }
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
                i + 1
            )
                .setScale(CARD_SCALE)
                .setDepth(1)
                .setInteractive({
                    draggable: true,
                } as Phaser.Types.Input.InputConfiguration);
            this.children.add(card);
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

