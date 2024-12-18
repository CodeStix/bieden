import React, { useEffect, useMemo, useRef, useState } from "react";
import { IRefPhaserGame, PhaserGame } from "./game/PhaserGame";
import {
    CardSuit,
    GameOverInfo,
    GameScene,
    Player,
    ScoreBoardItem,
} from "./game/scenes/GameScene";
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
    Heading,
    Table,
} from "@radix-ui/themes";

function ScoreBoard(props: { scoreBoard: ScoreBoardItem[] }) {
    return (
        <Table.Root size="1">
            <Table.Header>
                <Table.Row>
                    <Table.ColumnHeaderCell>Wij</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Zij</Table.ColumnHeaderCell>
                    {/* <Table.ColumnHeaderCell></Table.ColumnHeaderCell> */}
                </Table.Row>
            </Table.Header>

            <Table.Body>
                {props.scoreBoard.map((row, i) => (
                    <Table.Row
                        key={i}
                        style={{
                            backgroundColor:
                                row.itemType === "won" ||
                                row.itemType === "others-lost"
                                    ? "var(--green-4)"
                                    : row.itemType === "lost" ||
                                      row.itemType === "others-won"
                                    ? "var(--red-4)"
                                    : undefined,
                        }}
                    >
                        <Table.RowHeaderCell>
                            {row.ourScore}
                        </Table.RowHeaderCell>
                        <Table.Cell>{row.theirScore}</Table.Cell>
                        {/* <Table.Cell>Developer</Table.Cell> */}
                    </Table.Row>
                ))}
            </Table.Body>
        </Table.Root>
    );
}

function GameOverDialog(props: {
    open: boolean;
    onNewGame: () => void;
    gameOverInfo: GameOverInfo;
    localPlayer: Player;
}) {
    const localPlayerWon =
        props.gameOverInfo.player === props.localPlayer ||
        props.gameOverInfo.player.isFriend(props.localPlayer)
            ? props.gameOverInfo.won
            : !props.gameOverInfo.won;

    return (
        <AlertDialog.Root open={props.open}>
            <AlertDialog.Trigger>
                <Button color="red"></Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content maxWidth="450px">
                <AlertDialog.Title color={localPlayerWon ? "green" : "red"}>
                    {localPlayerWon ? "Ronde gewonnen!" : "Ronde verloren..."}
                </AlertDialog.Title>
                <AlertDialog.Description size="2">
                    {props.gameOverInfo.player === props.localPlayer ? (
                        <>Jij hebt</>
                    ) : (
                        <>{props.gameOverInfo.player.getName()} heeft</>
                    )}{" "}
                    {props.gameOverInfo.won ? (
                        <>
                            alle nodige punten kunnen halen (
                            {props.gameOverInfo.score} van de geboden{" "}
                            {props.gameOverInfo.offered}).
                        </>
                    ) : (
                        <>
                            niet alle nodige punten kunnen halen (hebben maar{" "}
                            {props.gameOverInfo.score} van de geboden{" "}
                            {props.gameOverInfo.offered}).
                        </>
                    )}
                </AlertDialog.Description>

                <Heading my="3" size="3">
                    Tussenstand
                </Heading>
                <ScoreBoard scoreBoard={props.gameOverInfo.scoreBoard} />

                {/* <AlertDialog.Action> */}
                <Button
                    style={{ width: "100%" }}
                    mt="4"
                    variant="solid"
                    color="green"
                    size="4"
                    onClick={props.onNewGame}
                >
                    Nieuw spel
                </Button>
                {/* </AlertDialog.Action> */}

                {/* <Flex gap="3" mt="4" justify="end">
                    <AlertDialog.Cancel>
                        <Button variant="soft" color="gray">
                            Cancel
                        </Button>
                    </AlertDialog.Cancel>
                    <AlertDialog.Action>
                        
                    </AlertDialog.Action>
                </Flex> */}
            </AlertDialog.Content>
        </AlertDialog.Root>
    );
}

function App() {
    //  References to the PhaserGame component (game and scene are exposed)
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const [showOfferDialog, setShowOfferDialog] = useState(false);
    const [recommendation, setRecommendation] = useState<{
        wijs: number;
        offer: number;
        suit: CardSuit;
    } | null>(null);
    const [alreadyOfferedPlayers, setAlreadyOfferedPlayers] = useState<
        Player[] | null
    >();
    const [minOffer, setCurrentMaxOffer] = useState<number>(0);
    const [offer, setOffer] = useState<number>(100);

    const [showGameOverDialog, setShowGameOverDialog] = useState(false);
    const [gameOverInfo, setGameOverInfo] = useState<GameOverInfo | null>(null);

    const scene = phaserRef.current?.scene;
    let localPlayer = scene?.getLocalPlayer();

    function submitOffer(offer: number | null) {
        const scene = phaserRef.current!.scene!;
        scene.putOffer(scene.getLocalPlayer(), offer);
        setShowOfferDialog(false);
    }

    return (
        <div id="app">
            <PhaserGame
                ref={phaserRef}
                onSceneLoaded={(scene) => {
                    scene.events.on(
                        "gameover",
                        (gameOverInfo: GameOverInfo) => {
                            console.log("gameover", gameOverInfo);
                            setGameOverInfo(gameOverInfo);
                            setShowGameOverDialog(true);
                        }
                    );

                    scene.events.on(
                        "shouldoffer",
                        (
                            player: Player,
                            recommendation: {
                                wijs: number;
                                offer: number;
                                suit: CardSuit;
                            } | null,
                            alreadyOfferedPlayers: Player[]
                        ) => {
                            let currentMaxOffer = 90;
                            alreadyOfferedPlayers.forEach((o) => {
                                if (
                                    o.offered !== null &&
                                    o.offered > currentMaxOffer
                                ) {
                                    currentMaxOffer = o.offered;
                                }
                            });

                            setOffer(currentMaxOffer + 10);
                            setCurrentMaxOffer(currentMaxOffer + 10);
                            setRecommendation(recommendation);
                            setAlreadyOfferedPlayers(alreadyOfferedPlayers);
                            setShowOfferDialog(true);
                        }
                    );
                }}
            />

            {gameOverInfo && localPlayer && (
                <GameOverDialog
                    localPlayer={localPlayer}
                    open={showGameOverDialog}
                    gameOverInfo={gameOverInfo}
                    onNewGame={() => {
                        setShowGameOverDialog(false);
                        scene?.newGame();
                    }}
                />
            )}

            <AlertDialog.Root
                open={showOfferDialog}
                onOpenChange={(o) => setShowOfferDialog(o)}
            >
                <AlertDialog.Content>
                    <AlertDialog.Title>Maak een bod</AlertDialog.Title>
                    <AlertDialog.Description mb="4">
                        <Text as="p">Hoeveel wil je bieden?</Text>

                        {alreadyOfferedPlayers && (
                            <ul style={{ margin: 0, paddingLeft: "1.5rem" }}>
                                {alreadyOfferedPlayers.map((player) => (
                                    <li key={player.index}>
                                        <Text as="span" color="orange">
                                            {player.getName()}{" "}
                                            {localPlayer &&
                                                player.isFriend(
                                                    localPlayer
                                                ) && <>(maat)</>}
                                        </Text>{" "}
                                        {player.offered !== null ? (
                                            <>
                                                heeft{" "}
                                                <Text as="span" weight="bold">
                                                    {player.offered}
                                                </Text>{" "}
                                                geboden
                                            </>
                                        ) : (
                                            <>heeft gepast.</>
                                        )}
                                    </li>
                                ))}
                                {alreadyOfferedPlayers.length !== 3 && (
                                    <li>
                                        {4 - alreadyOfferedPlayers.length - 1}{" "}
                                        speler(s) hierna moeten nog bieden.
                                    </li>
                                )}
                            </ul>
                        )}

                        {recommendation && recommendation.offer >= minOffer && (
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
                                disabled={offer - 10 < minOffer}
                                color="red"
                                variant="soft"
                                style={{ width: "100%" }}
                                size="4"
                                onClick={() => setOffer(offer - 10)}
                            >
                                Bod - 10
                            </Button>
                            <Button
                                disabled={offer - 100 < minOffer}
                                color="red"
                                variant="soft"
                                style={{ width: "100%" }}
                                size="4"
                                onClick={() => setOffer(offer - 100)}
                            >
                                Bod - 100
                            </Button>
                        </Flex>
                        <Flex
                            align="center"
                            justify="center"
                            direction="column"
                        >
                            <Text
                                size="8"
                                as="p"
                                style={{ fontWeight: "bold" }}
                            >
                                {String(offer)}
                            </Text>
                            <Text style={{ opacity: 0.5 }} size="3">
                                (min {minOffer})
                            </Text>
                        </Flex>
                        <Flex direction="column" gap="2">
                            <Button
                                disabled={offer + 10 >= 300}
                                color="green"
                                variant="soft"
                                style={{ width: "100%" }}
                                size="4"
                                onClick={() => setOffer(offer + 10)}
                            >
                                Bod + 10
                            </Button>
                            <Button
                                disabled={offer + 100 >= 300}
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

