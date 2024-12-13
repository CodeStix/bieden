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
            // this.setFaceDown(false);
        });
        this.on("drag", (_ev: any, x: number, y: number) => {
            this.x = x;
            this.y = y;
        });
        this.on("dragend", () => {
            // this.scale = CARD_SCALE;
            this.depth = 10;
            // this.setFaceDown(true);
            this.currentlyInCollection?.updateCardPositions();
        });
        this.on("drop", () => {
            console.log("drop card", this);
        });

        this.setScale(CARD_SCALE);
        this.setDepth(10);
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
    spacing = 80;
    anglePerCard = 3;
    type: "hand" | "radial";

    private positionsWhenDropped = new Map<Card, [number, number, number]>();

    constructor(
        type: "hand" | "radial",
        public x: number,
        public y: number,
        public angle: number
    ) {
        this.type = type;
        this.cards = [];
    }

    addCard(card: Card, updateCardPositions = true) {
        if (this.cards.some((e) => e === card)) {
            return;
        }

        this.cards.push(card);
        this.positionsWhenDropped.set(card, [card.x, card.y, card.angle]);

        if (card.currentlyInCollection) {
            let idx = card.currentlyInCollection.cards.indexOf(card);
            if (idx < 0) {
                console.error(
                    "Card removed from collection but not found in cards array"
                );
            } else {
                card.currentlyInCollection.cards.splice(idx, 1);
            }
            card.currentlyInCollection.updateCardPositions();
        }
        card.currentlyInCollection = this;

        if (updateCardPositions) this.updateCardPositions();
    }

    updateCardPositions() {
        if (this.type == "hand") {
            for (let i = 0; i < this.cards.length; i++) {
                let card = this.cards[i];
                let posDelta =
                    i * this.spacing -
                    ((this.cards.length - 1) * this.spacing) / 2;
                let angleDelta =
                    i * this.anglePerCard -
                    ((this.cards.length - 1) * this.anglePerCard) / 2;
                let newAngle = this.angle + angleDelta;
                card.moveTo(
                    this.x +
                        posDelta * Math.cos((newAngle / 360) * Math.PI * 2),
                    this.y +
                        posDelta * Math.sin((newAngle / 360) * Math.PI * 2),
                    newAngle,
                    i * 0.1
                );
                card.setDepth(10 + i);
            }
        } else if (this.type == "radial") {
            for (let i = 0; i < this.cards.length; i++) {
                let card = this.cards[i];
                // let [x, y, a] = this.positionsWhenDropped.get(card)!;
                card.moveTo(
                    this.x +
                        Math.cos(
                            ((card.angle + this.angle) / 360) * Math.PI * 2
                        ) *
                            this.spacing,
                    this.y +
                        Math.sin(
                            ((card.angle + this.angle) / 360) * Math.PI * 2
                        ) *
                            this.spacing,
                    card.angle,
                    i * 0.1
                );
            }
        }
    }
}

export class Player {
    hand: CardCollection;

    constructor(public scene: Scene, public index: number) {
        this.hand = new CardCollection(
            "hand",
            window.innerWidth / 2,
            window.innerHeight - 200,
            index == 3 ? -90 : index * 90
        );
    }
}

export class GameScene extends Scene {
    currentlyDragging!: Phaser.GameObjects.Sprite;
    testKey: Phaser.Input.Keyboard.Key;

    collection: CardCollection;
    collection2: CardCollection;
    dropZone: Phaser.GameObjects.GameObject;
    dropZoneText: Phaser.GameObjects.Text;
    dropZoneCollection: CardCollection;

    constructor() {
        super("GameScene");
    }

    preload() {
        this.load.image("cards", "assets/cards.png");
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
            "hand",
            window.innerWidth / 2,
            window.innerHeight - 200,
            0
        );

        this.collection2 = new CardCollection(
            "hand",
            200,
            window.innerHeight / 2,
            90
        );

        this.dropZoneCollection = new CardCollection(
            "radial",
            window.innerWidth / 2,
            window.innerHeight / 2,
            90
        );
        this.dropZoneCollection.spacing = 140;

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

            let card2 = new Card(
                this,
                100,
                100,
                Math.floor(counter / 13),
                (counter % 13) + 1,
                false
            );

            this.children.add(card);
            this.collection.addCard(card);

            this.children.add(card2);
            this.collection2.addCard(card2);
            counter++;
        });

        this.dropZone = this.add
            .rectangle(
                window.innerWidth / 2,
                window.innerHeight / 2,
                500,
                500,
                0x222222
            )
            .setDepth(1)
            .setInteractive({
                dropZone: true,
            } as Phaser.Types.Input.InputConfiguration);

        // These don't work (i don't get why?)
        // this.dropZone.on("dragenter", () => {
        //     console.log("dragenter");
        // });
        // this.dropZone.on("dragleave", () => {
        //     console.log("dragleave");
        // });
        // this.dropZone.on("dragover", (ev: any, x, y) => {
        //     console.log("dragover", ev, x, y);
        // });

        this.input.on("drop", (_ev: any, dropped: any, droppedOn: any) => {
            if (dropped instanceof Card && this.dropZone == droppedOn) {
                console.log("card got dropped on dropzone", dropped);
                this.dropZoneCollection.addCard(dropped, false);
            }
        });

        // this.add.sprite(30, 60, "card", 10);

        this.dropZoneText = this.add
            .text(
                window.innerWidth / 2,
                window.innerHeight / 2,
                "Sleep kaart\nhier",
                {
                    fontFamily: "Arial Black",
                    fontSize: 38,
                    color: "#aaaaaa",
                    // stroke: "#000000",
                    // strokeThickness: 8,
                    align: "center",
                }
            )
            .setOrigin(0.5)
            .setDepth(2);

        EventBus.emit("current-scene-ready", this);
    }

    update(time: number, delta: number): void {
        // console.log("update");
        super.update(time, delta);
    }
}

