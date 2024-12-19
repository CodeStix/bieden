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
    Button,
    Flex,
    Text,
    Grid,
    Separator,
    AlertDialog,
    Heading,
    Table,
} from "@radix-ui/themes";
import { useNavigate } from "react-router";
import Confetti from "react-confetti";
import {
    faArrowRight,
    faCoins,
    faDoorOpen,
    faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { incrementAirtableScore } from "./HomePage";

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
    const navigate = useNavigate();
    const localPlayerWon =
        props.gameOverInfo.player === props.localPlayer ||
        props.gameOverInfo.player.isFriend(props.localPlayer)
            ? props.gameOverInfo.won
            : !props.gameOverInfo.won;

    return (
        <>
            {props.gameOverInfo.wonTree === true && <Confetti />}
            <AlertDialog.Root open={props.open}>
                <AlertDialog.Content maxWidth="450px">
                    <AlertDialog.Title
                        color={
                            props.gameOverInfo.wonTree === true
                                ? "yellow"
                                : props.gameOverInfo.wonTree === false
                                ? "red"
                                : localPlayerWon
                                ? "green"
                                : "red"
                        }
                    >
                        {props.gameOverInfo.wonTree === true
                            ? "Boom gewonnen!"
                            : props.gameOverInfo.wonTree === false
                            ? "Boom verloren..."
                            : localPlayerWon
                            ? "Ronde gewonnen!"
                            : "Ronde verloren..."}
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
                                niet alle nodige punten kunnen halen (hebben
                                maar {props.gameOverInfo.score} van de geboden{" "}
                                {props.gameOverInfo.offered}).
                            </>
                        )}
                    </AlertDialog.Description>

                    <Heading my="3" size="3">
                        Tussenstand
                    </Heading>
                    <ScoreBoard scoreBoard={props.gameOverInfo.scoreBoard} />

                    {props.gameOverInfo.wonTree === undefined ? (
                        <Button
                            style={{ width: "100%" }}
                            mt="4"
                            variant="solid"
                            color="green"
                            size="4"
                            onClick={props.onNewGame}
                        >
                            Start volgende ronde{" "}
                            <FontAwesomeIcon icon={faArrowRight} />
                        </Button>
                    ) : (
                        <>
                            <Button
                                style={{ width: "100%" }}
                                mt="4"
                                variant="solid"
                                color="red"
                                size="4"
                                onClick={() => navigate("/")}
                            >
                                Spel verlaten{" "}
                                <FontAwesomeIcon icon={faDoorOpen} />
                            </Button>
                            <Button
                                style={{ width: "100%" }}
                                mt="2"
                                variant="solid"
                                color="green"
                                size="4"
                                onClick={() => (location.href = location.href)}
                            >
                                Nieuw spel{" "}
                                <FontAwesomeIcon icon={faArrowRight} />
                            </Button>
                        </>
                    )}
                </AlertDialog.Content>
            </AlertDialog.Root>
        </>
    );
}

export function GamePage() {
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

    const help = false;

    return (
        <div id="app" style={{ overflow: "hidden" }}>
            <PhaserGame
                ref={phaserRef}
                onSceneLoaded={(scene) => {
                    scene.events.on(
                        "gameover",
                        (gameOverInfo: GameOverInfo) => {
                            console.log("gameover", gameOverInfo);
                            setGameOverInfo(gameOverInfo);
                            setShowGameOverDialog(true);

                            const localPlayer =
                                phaserRef.current!.scene!.getLocalPlayer();
                            const localPlayerPlayed =
                                localPlayer === gameOverInfo.player ||
                                localPlayer.isFriend(gameOverInfo.player);
                            if (gameOverInfo.won) {
                                if (localPlayerPlayed) {
                                    void incrementAirtableScore(
                                        -gameOverInfo.meten
                                    );
                                }
                            } else {
                                if (localPlayerPlayed) {
                                    void incrementAirtableScore(
                                        gameOverInfo.meten
                                    );
                                } else {
                                    void incrementAirtableScore(
                                        -gameOverInfo.meten
                                    );
                                }
                            }
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

                        {help &&
                            recommendation &&
                            recommendation.offer >= minOffer && (
                                <Text as="p" style={{ fontWeight: "bold" }}>
                                    Aanbevolen: {recommendation.offer} (
                                    {CardSuit[recommendation.suit]})
                                </Text>
                            )}
                    </AlertDialog.Description>

                    <Button
                        size="4"
                        color="red"
                        style={{ width: "100%" }}
                        onClick={() => submitOffer(null)}
                    >
                        <FontAwesomeIcon icon={faTimes} /> Passen
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
                        <FontAwesomeIcon icon={faCoins} /> {offer} bieden
                    </Button>
                </AlertDialog.Content>
            </AlertDialog.Root>
        </div>
    );
}

