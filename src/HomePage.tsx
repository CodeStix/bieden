import {
    faArrowRight,
    faCrown,
    faWarning,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    Box,
    Button,
    Callout,
    Flex,
    Heading,
    Skeleton,
    Table,
    Text,
} from "@radix-ui/themes";
import { useNavigate } from "react-router";
import Airtable from "airtable";
import { useEffect, useState } from "react";

const airtableBase = new Airtable({
    apiKey: import.meta.env.VITE_SCOREBOARD_AIRTABLE_TOKEN,
}).base(import.meta.env.VITE_SCOREBOARD_AIRTABLE_BASE);

export function HomePage() {
    const navigate = useNavigate();

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
                    onClick={() => navigate("/play")}
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
        </Flex>
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

