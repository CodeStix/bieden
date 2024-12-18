import { Button, Flex, Heading, Text } from "@radix-ui/themes";
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
                    Start nieuw spel
                </Button>
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

            <Flex direction="column" minHeight="100vh" p="4">
                <Heading size="8">Tussenstand</Heading>
            </Flex>
        </Flex>
    );
}

