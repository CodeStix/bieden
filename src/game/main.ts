import { GameScene } from "./scenes/GameScene";
import { AUTO, Game } from "phaser";

//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig

const width = Math.max(1000, window.innerWidth);

const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: width, //window.innerWidth,
    height: width * (window.innerHeight / window.innerWidth),
    scale: {
        mode: Phaser.Scale.FIT,
    },
    // mode: Phaser.Scale,
    parent: "game-container",
    backgroundColor: "#111111",
    scene: [GameScene],
};

const StartGame = (parent: string) => {
    return new Game({ ...config, parent });
};

export default StartGame;

