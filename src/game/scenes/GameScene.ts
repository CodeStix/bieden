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

function getCardSuitOrder(suit: CardSuit) {
    switch (suit) {
        case CardSuit.CLUBS:
            return 0;
        case CardSuit.HEARTS:
            return 1;
        case CardSuit.SPADES:
            return 2;
        case CardSuit.DIAMONDS:
            return 3;
    }
}

class Card extends Phaser.GameObjects.Sprite {
    private faceFrame: number;
    private isFaceDown: boolean;
    private flipTween?: Phaser.Tweens.Tween;
    private moveToTween?: Phaser.Tweens.Tween;

    public currentlyInCollection?: CardCollection;

    // For value, 2 = 2 ... 13 = king, 14 = ace
    constructor(
        scene: Scene,
        x: number,
        y: number,
        public readonly suit: CardSuit,
        public readonly value: number,
        isFaceDown: boolean
    ) {
        if (value < 2 || value > 14) {
            console.error("Invalid card value", value);
            value = 2;
        }

        let fr = suit * 14 + (value == 14 ? 0 : value - 1);
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

        if (this.flipTween) {
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
        if (this.moveToTween) {
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

    sortCards() {
        this.cards.sort(
            (a, b) =>
                (getCardSuitOrder(a.suit) - getCardSuitOrder(b.suit)) * 100 +
                a.value -
                b.value
        );
        this.updateCardPositions();
    }
}

export class Player {
    hand: CardCollection;

    constructor(public scene: Scene, public index: number) {
        const EDGE_SPACING = 100;
        this.hand = new CardCollection(
            "hand",
            index == 0 || index == 2
                ? window.innerWidth / 2
                : index == 1
                ? EDGE_SPACING
                : window.innerWidth - EDGE_SPACING,
            index == 1 || index == 3
                ? window.innerHeight / 2
                : index == 2
                ? EDGE_SPACING
                : window.innerHeight - EDGE_SPACING,
            index == 3 ? -90 : index * 90
        );
    }
}

export class GameScene extends Scene {
    currentlyDragging!: Phaser.GameObjects.Sprite;
    testKey: Phaser.Input.Keyboard.Key;

    allCards: Card[];
    players: Player[];
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
        this.players = [];
        for (let i = 0; i < 4; i++) {
            this.players.push(new Player(this, i));
        }

        this.allCards = [];
        for (let s = 0; s < 4; s++) {
            for (let v = 7; v <= 14; v++) {
                let card = new Card(
                    this,
                    window.innerWidth / 2,
                    window.innerHeight / 2,
                    s,
                    v,
                    true
                );
                this.allCards.push(card);
                this.children.add(card);
            }
        }

        // Shuffle
        for (let i = 0; i < this.allCards.length; i++) {
            let r = Math.floor(Math.random() * this.allCards.length);
            let t = this.allCards[i];
            this.allCards[i] = this.allCards[r];
            this.allCards[r] = t;
        }

        // Deal cards
        const DEAL_INTERVAL = 100;
        for (let i = 0; i < this.allCards.length; i++) {
            this.time.delayedCall(i * DEAL_INTERVAL, () => {
                let card = this.allCards[i];
                let targetPlayerIdx = Math.floor((i / 4) % 4);
                if (targetPlayerIdx == 0) card.setFaceDown(false);
                this.players[targetPlayerIdx].hand.addCard(card);
            });
        }

        this.time.delayedCall(this.allCards.length * DEAL_INTERVAL, () => {
            this.players[0].hand.sortCards();
        });

        this.dropZoneCollection = new CardCollection(
            "radial",
            window.innerWidth / 2,
            window.innerHeight / 2,
            90
        );
        this.dropZoneCollection.spacing = 140;

        let counter = 0;

        // this.input.keyboard!.on("keydown-A", () => {
        //     for (let i = 0; i < 4; i++) {
        //         let card = new Card(
        //             this,
        //             100,
        //             100,
        //             Math.floor(counter / 13),
        //             (counter % 13) + 2,
        //             false
        //         );

        //         this.children.add(card);
        //         this.players[i].hand.addCard(card);
        //     }

        //     counter++;
        // });

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

