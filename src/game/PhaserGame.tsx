import { forwardRef, useEffect, useLayoutEffect, useRef } from "react";
import StartGame from "./main";
import { EventBus } from "./EventBus";

export interface IRefPhaserGame {
    game: Phaser.Game | null;
    scene: Phaser.Scene | null;
}

interface IProps {
    onSceneLoaded?: (sceneInstance: Phaser.Scene) => void;
}

export const PhaserGame = forwardRef<IRefPhaserGame, IProps>(
    function PhaserGame({ onSceneLoaded }, ref) {
        const game = useRef<Phaser.Game | null>(null!);

        useLayoutEffect(() => {
            if (game.current === null) {
                game.current = StartGame("game-container");

                if (typeof ref === "function") {
                    ref({ game: game.current, scene: null });
                } else if (ref) {
                    ref.current = { game: game.current, scene: null };
                }
            }

            return () => {
                if (game.current) {
                    game.current.destroy(true);
                    if (game.current !== null) {
                        game.current = null;
                    }
                }
            };
        }, [ref]);

        useEffect(() => {
            EventBus.on(
                "current-scene-ready",
                (sceneInstance: Phaser.Scene) => {
                    if (onSceneLoaded && typeof onSceneLoaded === "function") {
                        onSceneLoaded(sceneInstance);
                    }

                    if (typeof ref === "function") {
                        ref({ game: game.current, scene: sceneInstance });
                    } else if (ref) {
                        ref.current = {
                            game: game.current,
                            scene: sceneInstance,
                        };
                    }
                }
            );
            return () => {
                EventBus.removeListener("current-scene-ready");
            };
        }, [onSceneLoaded, ref]);

        return <div id="game-container"></div>;
    }
);

