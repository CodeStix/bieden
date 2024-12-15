import { useEffect, useRef, useState } from "react";
import { IRefPhaserGame, PhaserGame } from "./game/PhaserGame";
import { CardSuit, GameScene, Player } from "./game/scenes/GameScene";
import {
    Dialog,
    Button,
    Flex,
    TextField,
    Text,
    RadioCards,
    Grid,
    Box,
    Separator,
    AlertDialog,
} from "@radix-ui/themes";

function App() {
    //  References to the PhaserGame component (game and scene are exposed)
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const [showOfferDialog, setShowOfferDialog] = useState(false);
    const [recommendation, setRecommendation] = useState<{
        suit: CardSuit;
        offer: number;
    } | null>(null);
    const [offer, setOffer] = useState<number>(100);
    // const scene = phaserRef.current.scene as GameScene;

    // useEffect(() => {
    //     if (phaserRef.current) {
    //         const scene = phaserRef.current.scene as GameScene;
    //     }
    // }, [phaserRef.current]);

    function submitOffer(offer: number | null) {
        const scene = phaserRef.current!.scene!;
        scene.putOffer(scene.getLocalPlayer(), offer);
        setShowOfferDialog(false);
    }

    const scene = phaserRef.current?.scene;

    return (
        <div id="app">
            <PhaserGame
                ref={phaserRef}
                onSceneLoaded={(scene) => {
                    console.log("currentActiveScene", scene);
                    scene.events.on(
                        "shouldoffer",
                        (
                            player: Player,
                            recommendedSuit: CardSuit | null,
                            recommendedOffer: number | null
                        ) => {
                            console.log(
                                "Should offer",
                                player,
                                recommendedSuit,
                                recommendedOffer
                            );
                            setOffer(100);
                            if (recommendedSuit && recommendedOffer) {
                                setRecommendation({
                                    suit: recommendedSuit,
                                    offer: recommendedOffer,
                                });
                            }
                            setShowOfferDialog(true);
                        }
                    );
                }}
            />
            <AlertDialog.Root
                open={showOfferDialog}
                onOpenChange={(o) => setShowOfferDialog(o)}
            >
                <AlertDialog.Content>
                    <AlertDialog.Title>Maak een bod</AlertDialog.Title>
                    <AlertDialog.Description mb="4">
                        <Text as="p">Hoeveel wil je bieden?</Text>

                        {scene?.players.map((p) => (
                            <Text as="p">
                                Speler{" "}
                                <Text as="span" style={{ fontWeight: "bold" }}>
                                    {p.getName()}{" "}
                                    {p.isFriend(scene.getLocalPlayer())
                                        ? "(maat)"
                                        : null}
                                </Text>{" "}
                                {p.offered ? (
                                    <Text
                                        as="span"
                                        style={{ fontWeight: "bold" }}
                                    >
                                        bied {p.offered}
                                    </Text>
                                ) : (
                                    "past"
                                )}
                            </Text>
                        ))}

                        {recommendation && (
                            <Text as="p" style={{ fontWeight: "bold" }}>
                                Aanbevolen: {recommendation.offer} (
                                {CardSuit[recommendation.suit]})
                            </Text>
                        )}
                    </AlertDialog.Description>

                    <Button
                        size="4"
                        color="orange"
                        style={{ width: "100%" }}
                        onClick={() => submitOffer(null)}
                    >
                        Passen
                    </Button>

                    <Separator style={{ width: "100%", margin: "2rem 0" }} />

                    <Grid
                        columns={window.innerWidth > 1000 ? "3" : "1"}
                        gap="3"
                    >
                        <Flex direction="column" gap="2">
                            <Button
                                disabled={offer < 110}
                                color="red"
                                variant="soft"
                                style={{ width: "100%" }}
                                size="4"
                                onClick={() => setOffer(offer - 10)}
                            >
                                Bod - 10
                            </Button>
                            <Button
                                disabled={offer < 200}
                                color="red"
                                variant="soft"
                                style={{ width: "100%" }}
                                size="4"
                                onClick={() => setOffer(offer - 100)}
                            >
                                Bod - 100
                            </Button>
                        </Flex>
                        <Flex align="center" justify="center">
                            <Text
                                size="8"
                                as="p"
                                style={{ fontWeight: "bold" }}
                            >
                                {String(offer)}
                            </Text>
                        </Flex>
                        <Flex direction="column" gap="2">
                            <Button
                                disabled={offer >= 300}
                                color="green"
                                variant="soft"
                                style={{ width: "100%" }}
                                size="4"
                                onClick={() => setOffer(offer + 10)}
                            >
                                Bod + 10
                            </Button>
                            <Button
                                disabled={offer >= 300}
                                color="green"
                                variant="soft"
                                style={{ width: "100%" }}
                                size="4"
                                onClick={() => setOffer(offer + 100)}
                            >
                                Bod + 100
                            </Button>
                        </Flex>
                    </Grid>
                    <Button
                        onClick={() => submitOffer(offer)}
                        size="4"
                        color="blue"
                        style={{ width: "100%" }}
                        mt="4"
                    >
                        {offer} bieden
                    </Button>

                    {/* <RadioCards.Root
                        // value={offer}

                        columns={{ initial: "1", sm: "3" }}
                    >
                        {[
                            100, 110, 120, 130, 140, 150, 160, 170, 180, 190,
                            200, 210, 220, 230, 240, 250, 260, 270, 280, 290,
                            300,
                        ].map((o) => (
                            <RadioCards.Item
                                value={String(o)}
                                key={o}
                                onClick={(ev) => {
                                    setOffer(String(o));
                                }}
                            >
                                <Flex direction="column" width="100%">
                                    <Text weight="bold">Bied {o}</Text>
                                </Flex>
                            </RadioCards.Item>
                        ))}
                    </RadioCards.Root> */}

                    {/* <Flex gap="3" mt="4" justify="end">
                        <AlertDialog.Close>
                            <Button variant="soft" color="gray">
                                Annuleren
                            </Button>
                        </AlertDialog.Close>
                        <AlertDialog.Close>
                            <Button>Bod plaatsen</Button>
                        </AlertDialog.Close>
                    </Flex> */}
                </AlertDialog.Content>
            </AlertDialog.Root>
        </div>
    );
}

export default App;

