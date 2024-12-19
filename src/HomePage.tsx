import {
    faArrowRight,
    faCheck,
    faCrown,
    faWarning,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    Box,
    Button,
    Callout,
    Dialog,
    Flex,
    Heading,
    Skeleton,
    Table,
    Text,
    TextField,
} from "@radix-ui/themes";
import { useNavigate } from "react-router";
import Airtable from "airtable";
import { useEffect, useMemo, useState } from "react";

export const LOCALSTORAGE_ITEM = "bieden-player-id";

const airtableBase = new Airtable({
    apiKey: import.meta.env.VITE_SCOREBOARD_AIRTABLE_TOKEN,
}).base(import.meta.env.VITE_SCOREBOARD_AIRTABLE_BASE);

async function createAirtablePlayer(name: string) {
    try {
        const result = await airtableBase("BiedenScoreBoard").create([
            {
                fields: {
                    name: name,
                    score: 0,
                    lastPlayedAt: new Date().getTime(),
                },
            },
        ]);

        return result[0].getId();
    } catch (ex) {
        console.error("Could not create airtable player", ex);
    }
}

export async function incrementAirtableScore(amount: number) {
    try {
        const recordId = localStorage.getItem(LOCALSTORAGE_ITEM)!;

        const record = await airtableBase("BiedenScoreBoard").find(recordId);

        let currentScore = record.fields["score"] as number;
        currentScore += amount;

        await airtableBase("BiedenScoreBoard").update(recordId, {
            score: currentScore,
        });
    } catch (ex) {
        console.error("Could not increment airtable score");
    }
}

export function HomePage() {
    const navigate = useNavigate();
    const [showNameInput, setShowNameInput] = useState(false);
    const [submittingName, setSubmittingName] = useState(false);

    // 2024-12-19T22:13:52.026Z
    // 2019-12-30T21:42:00.000Z

    return (
        <Flex direction="column">
            <Flex
                position="relative"
                direction="column"
                align="center"
                justify="center"
                height="100vh"
            >
                <img width="192px" height="192px" src="/icon192nobg.png"></img>
                <Heading size="8">Bieden</Heading>
                <Text style={{ opacity: 0.5 }} as="p">
                    Het kaartspel
                </Text>
                <Button
                    mt="4"
                    color="green"
                    size="4"
                    onClick={() => {
                        if (localStorage.getItem(LOCALSTORAGE_ITEM)) {
                            navigate("/play");
                        } else {
                            setShowNameInput(true);
                        }
                    }}
                >
                    Start nieuw spel <FontAwesomeIcon icon={faArrowRight} />
                </Button>
                <Callout.Root color="yellow" mb="2" mt="4">
                    <Callout.Icon>
                        <FontAwesomeIcon icon={faWarning} />
                    </Callout.Icon>
                    <Callout.Text style={{ margin: 0 }}>
                        Op dit moment mist het online spel nog:
                        <ul
                            style={{
                                margin: 0,
                                paddingLeft: "1.5rem",
                                marginTop: "0.3rem",
                            }}
                        >
                            <li>Pandoer</li>
                            <li>Verbeteringen aan bieden door robots</li>
                            <li>Multiplayer</li>
                        </ul>
                    </Callout.Text>
                </Callout.Root>

                <Box height="100px"></Box>
                <Text
                    align="center"
                    style={{
                        position: "absolute",
                        bottom: "5rem",
                        opacity: 0.8,
                    }}
                >
                    Scroll naar beneden voor scoreboard
                </Text>
            </Flex>

            <Flex
                direction="column"
                minHeight="100vh"
                p="8"
                style={{ backgroundColor: "#222224" }}
            >
                <Heading size="8">Scorebord</Heading>
                <Text as="p" my="2">
                    Elke speler heeft een oneindige boom voor elk speletje dat
                    hij/zij speelt.
                </Text>

                <GlobalScoreBoard />
            </Flex>

            <InputNameDialog
                submitting={submittingName}
                open={showNameInput}
                onOpenChange={(o) => setShowNameInput(o)}
                onSubmit={async (name) => {
                    setSubmittingName(true);
                    await new Promise((res) => setTimeout(res, 1000));

                    const playerId = await createAirtablePlayer(name);
                    if (playerId) {
                        localStorage.setItem(LOCALSTORAGE_ITEM, playerId);
                    }

                    navigate("/play");
                    setSubmittingName(false);
                    setShowNameInput(false);
                }}
            />
        </Flex>
    );
}

function InputNameDialog(props: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (value: string) => void;
    submitting: boolean;
}) {
    const [name, setName] = useState("");

    const nameIsValid = useMemo(
        () => /^[a-zA-Z0-9 _-]{2,30}$/.test(name),
        [name]
    );

    return (
        <Dialog.Root onOpenChange={props.onOpenChange} open={props.open}>
            <Dialog.Content maxWidth="450px">
                <Dialog.Title>Wat is je naam?</Dialog.Title>
                <Dialog.Description size="2" mb="4">
                    Je naam zal op het scoreboard komen.
                </Dialog.Description>

                <Flex direction="column" gap="3">
                    <label>
                        <Text as="div" size="2" mb="1" weight="bold">
                            Naam
                        </Text>
                        <TextField.Root
                            value={name}
                            placeholder=""
                            onChange={(ev) => setName(ev.target.value)}
                        />
                    </label>
                </Flex>

                <Flex gap="3" mt="4" justify="end">
                    <Dialog.Close>
                        <Button variant="soft" color="gray">
                            Annuleren
                        </Button>
                    </Dialog.Close>
                    <Button
                        color="green"
                        onClick={() => props.onSubmit(name.trim())}
                        disabled={!nameIsValid || props.submitting}
                        loading={props.submitting}
                    >
                        Opslaan <FontAwesomeIcon icon={faCheck} />
                    </Button>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
}

type GlobalScoreBoardItem = {
    id: number;
    name: string;
    score: number;
};

function GlobalScoreBoard() {
    const [scores, setScores] = useState<GlobalScoreBoardItem[] | null>(null);

    useEffect(() => {
        airtableBase("BiedenScoreBoard")
            .select({
                maxRecords: 20,
                view: "Grid view",
                sort: [{ field: "score", direction: "asc" }],
            })
            .all()
            .then((records) => {
                setScores(records.map((e) => e.fields as GlobalScoreBoardItem));
            });
    }, []);

    return (
        <Table.Root>
            <Table.Header>
                <Table.Row>
                    <Table.ColumnHeaderCell width="20px">
                        #
                    </Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Naam</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Meten</Table.ColumnHeaderCell>
                </Table.Row>
            </Table.Header>

            <Table.Body>
                {scores?.map((item, i) => (
                    <Table.Row key={item.id}>
                        <Table.RowHeaderCell>{i + 1}</Table.RowHeaderCell>
                        <Table.Cell>
                            <Text
                                weight={i < 3 ? "bold" : undefined}
                                color={
                                    i === 0
                                        ? "gold"
                                        : i === 1
                                        ? "gray"
                                        : i === 2
                                        ? "bronze"
                                        : undefined
                                }
                            >
                                {i === 0 && <FontAwesomeIcon icon={faCrown} />}{" "}
                                {item.name}
                            </Text>
                        </Table.Cell>
                        <Table.Cell>{item.score}</Table.Cell>
                    </Table.Row>
                )) ?? (
                    <>
                        {new Array(5).fill(0).map((_, i) => (
                            <Table.Row key={i}>
                                <Table.RowHeaderCell>
                                    <Skeleton width="20px" height="20px" />
                                </Table.RowHeaderCell>
                                <Table.Cell>
                                    <Skeleton width="160px" height="20px" />
                                </Table.Cell>
                                <Table.Cell>
                                    <Skeleton width="50px" height="20px" />
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </>
                )}
            </Table.Body>
        </Table.Root>
    );
}

