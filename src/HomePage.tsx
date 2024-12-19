import { faArrowRight, faWarning } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    Box,
    Button,
    Callout,
    Flex,
    Heading,
    Table,
    Text,
} from "@radix-ui/themes";
import { useNavigate } from "react-router";

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
                            <li>
                                Verbeteringen aan <br />
                                bieden/spelen door robots
                            </li>
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

                <Callout.Root color="yellow" mb="2">
                    <Callout.Icon>
                        <FontAwesomeIcon icon={faWarning} />
                    </Callout.Icon>
                    <Callout.Text>
                        Het scorebord is nog in ontwikkeling en bevat op dit
                        moment dummy informatie.
                    </Callout.Text>
                </Callout.Root>

                <Table.Root>
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeaderCell width="20px">
                                #
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>
                                Naam
                            </Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>
                                Meten
                            </Table.ColumnHeaderCell>
                        </Table.Row>
                    </Table.Header>

                    <Table.Body>
                        <Table.Row>
                            <Table.RowHeaderCell>1</Table.RowHeaderCell>
                            <Table.Cell>Stijn Rogiest</Table.Cell>
                            <Table.Cell>-10</Table.Cell>
                        </Table.Row>

                        <Table.Row>
                            <Table.RowHeaderCell>2</Table.RowHeaderCell>
                            <Table.Cell>Brent Rogiest</Table.Cell>
                            <Table.Cell>-5</Table.Cell>
                        </Table.Row>
                    </Table.Body>
                </Table.Root>
            </Flex>
        </Flex>
    );
}

