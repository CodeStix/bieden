import { useRef, useState } from "react";
import { IRefPhaserGame, PhaserGame } from "./game/PhaserGame";
import { MainMenu } from "./game/scenes/MainMenu";

function App() {
    // The sprite can only be moved in the MainMenu Scene
    // const [canMoveSprite, setCanMoveSprite] = useState(true);

    //  References to the PhaserGame component (game and scene are exposed)
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    // const [spritePosition, setSpritePosition] = useState({ x: 0, y: 0 });

    const moveSprite = () => {
        if (phaserRef.current) {
            const scene = phaserRef.current.scene as MainMenu;

            // if (scene && scene.scene.key === "MainMenu") {
            //     // Get the update logo position
            //     scene.moveLogo(({ x, y }) => {
            //         setSpritePosition({ x, y });
            //     });
            // }
        }
    };

    return (
        <div id="app">
            <PhaserGame
                ref={phaserRef}
                onSceneLoaded={(scene) => {
                    console.log("currentActiveScene", scene);
                }}
            />
            <div>
                <div>
                    <button className="button" onClick={moveSprite}>
                        Add New Sprite
                    </button>
                </div>
            </div>
        </div>
    );
}

export default App;

