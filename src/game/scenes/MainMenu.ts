import { GameObjects, Scene } from "phaser";

import { EventBus } from "../EventBus";

const CARD_SCALE = 2;

export class MainMenu extends Scene {
    currentlyDragging!: Phaser.GameObjects.Sprite;

    constructor() {
        super("MainMenu");
    }

    preload() {
        this.load.spritesheet("card", "assets/cards.png", {
            frameWidth: 72,
            frameHeight: 96,
        });
    }

    create() {
        for (let i = 0; i < 8; i++) {
            let card = this.add
                .sprite(i * 80 + 72 / 2, 96 / 2, "card", i)
                .setScale(CARD_SCALE)
                .setInteractive({
                    draggable: true,
                } as Phaser.Types.Input.InputConfiguration);

            card.on("dragstart", () => {
                console.log("on start dragging card");
                this.currentlyDragging = card;
                card.scale = CARD_SCALE + 0.5;
            });
            card.on("drag", (_ev: any, x: number, y: number) => {
                card.x = x;
                card.y = y;
            });
            card.on("dragend", () => {
                card.scale = CARD_SCALE;
            });
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
    }
}

