import { GameObjects, Scene } from "phaser";

import { EventBus } from "../EventBus";

// const SCALE = window.innerWidth < 500 ? 0.5 : 1;
const CARD_SCALE = 2;
const CARD_WIDTH = 72;
const CARD_HEIGHT = 96;

export enum CardSuit {
    CLUBS = 0,
    SPADES = 1,
    HEARTS = 2,
    DIAMONDS = 3,
}
const FACE_DOWN_FRAME = 13;

function getCardSuitOrder(suit: CardSuit, noHearts = false) {
    switch (suit) {
        case CardSuit.CLUBS:
            return 0;
        case CardSuit.HEARTS:
            return 1;
        case CardSuit.SPADES:
            return 2;
        case CardSuit.DIAMONDS:
            return noHearts ? 1 : 3;
    }
}

export class Card extends Phaser.GameObjects.Sprite {
    private faceFrame: number;
    private isFaceDown: boolean;
    private flipTween?: Phaser.Tweens.Tween;
    private moveToTween?: Phaser.Tweens.Tween;
    private markTween?: Phaser.Tweens.Tween;
    private markerRect: Phaser.GameObjects.Rectangle;

    public currentlyInCollection?: CardCollection;
    public originalOwner: Player;

    // For value, 2 = 2 ... 13 = king, 14 = ace
    constructor(
        scene: Scene,
        x: number,
        y: number,
        public readonly suit: CardSuit,
        public readonly value: number,
        isFaceDown: boolean
    ) {
        if (value < 2 || value > 14) {
            console.error("Invalid card value", value);
            value = 2;
        }

        let fr = suit * 14 + (value == 14 ? 0 : value - 1);
        super(scene, x, y, "card", isFaceDown ? FACE_DOWN_FRAME : fr);

        this.faceFrame = fr;

        this.isFaceDown = isFaceDown;

        this.on("dragstart", () => {
            // this.scale = CARD_SCALE + 0.5;

            this.depth = 100;
            // this.setFaceDown(false);
        });
        this.on("drag", (_ev: any, x: number, y: number) => {
            this.stopMark();

            this.x = x;
            this.y = y;
        });
        this.on("dragend", () => {
            // this.scale = CARD_SCALE;
            this.depth = 10;
            // this.setFaceDown(true);
            this.currentlyInCollection?.updateCardPositions();
        });
        this.on("drop", () => {
            console.log("drop card", this);
        });

        this.setScale(CARD_SCALE);
        this.setDepth(10);
        this.setInteractive({
            draggable: true,
        } as Phaser.Types.Input.InputConfiguration);

        this.markerRect = this.scene.add.rectangle(
            this.x,
            this.y,
            this.width * this.scale + 20,
            this.height * this.scale + 20,
            0xffff00
        );
        this.markerRect.setDepth(5);
        this.markerRect.alpha = 0;
        this.scene.children.add(this.markerRect);
    }

    isMarked() {
        return this.markTween !== undefined;
    }

    setEnabled(enabled: boolean) {
        this.setTint(enabled ? 0xffffff : 0x777777);
    }

    stopMark(immediately = true) {
        if (this.markTween) {
            if (immediately) this.markTween.stop();
            else this.markTween.completeAfterLoop();

            this.markTween = undefined;
        }
    }

    mark(amount = 50, ease = Phaser.Math.Easing.Expo.Out, delay = 0) {
        // this.scene.tweens.add({
        //     targets: this.markerRect,
        //     yoyo: true,
        //     ease: Phaser.Math.Easing.Sine.InOut,
        //     alpha: 0.5,
        //     duration: 500,
        //     loop: -1,
        // });
        this.stopMark();

        this.markTween = this.scene.tweens.add({
            targets: this,
            yoyo: true,
            ease: ease,
            y:
                this.y -
                Math.sin(((this.angle + 90) / 360) * Math.PI * 2) * amount,
            x:
                this.x -
                Math.cos(((this.angle + 90) / 360) * Math.PI * 2) * amount,
            duration: 500,
            loop: -1,
            startDelay: delay,
            // loopDelay: 500,
        });
    }

    update() {
        // console.log("Update marker");
        this.markerRect.x = this.x;
        this.markerRect.y = this.y;
        this.markerRect.angle = this.angle;
    }

    setFaceDown(faceDown: boolean) {
        if (this.isFaceDown == faceDown) return;

        // this.stopMark();

        if (this.flipTween) {
            this.flipTween.stop();
        }
        this.flipTween = this.scene.tweens.add({
            targets: this,
            duration: 100,
            scaleX: 0,
            yoyo: true,
            ease: Phaser.Math.Easing.Circular.InOut,
            onYoyo: () => {
                this.setFrame(faceDown ? FACE_DOWN_FRAME : this.faceFrame);
            },
            onComplete: () => {
                this.scale = CARD_SCALE;
            },
        });
        this.isFaceDown = faceDown;
    }

    moveTo(x: number, y: number, angle: number, delay = 0, scale = CARD_SCALE) {
        if (this.markTween) {
            this.markTween.stop();
            this.markTween = undefined;
        }

        if (this.moveToTween) {
            this.moveToTween.stop();
        }
        this.moveToTween = this.scene.tweens.add({
            targets: this,
            duration: 300,
            x: x,
            y: y,
            delay: delay,
            angle: angle,
            ease: Phaser.Math.Easing.Cubic.Out,
            scale: scale,
        });
    }

    toString() {
        return `${this.value} of ${CardSuit[this.suit]}`;
    }
}

export class CardCollection {
    cards: Card[];
    spacing = 80;
    anglePerCard = 3;
    type: "hand" | "radial";
    cardScale = CARD_SCALE;

    private positionsWhenDropped = new Map<Card, [number, number, number]>();

    constructor(
        type: "hand" | "radial",
        public x: number,
        public y: number,
        public angle: number
    ) {
        this.type = type;
        this.cards = [];
    }

    removeCard(card: Card) {
        let idx = this.cards.indexOf(card);
        if (idx < 0) {
            console.error("Card to remove from collection not found");
            return;
        } else {
            this.cards.splice(idx, 1);
        }
        this.updateCardPositions();
    }

    addCard(card: Card, updateCardPositions = true) {
        if (this.cards.some((e) => e === card)) {
            return;
        }

        this.cards.push(card);
        this.positionsWhenDropped.set(card, [card.x, card.y, card.angle]);

        if (card.currentlyInCollection) {
            card.currentlyInCollection.removeCard(card);
            // let idx = card.currentlyInCollection.cards.indexOf(card);
            // if (idx < 0) {
            //     console.error(
            //         "Card removed from collection but not found in cards array"
            //     );
            // } else {
            //     card.currentlyInCollection.cards.splice(idx, 1);
            // }
            // card.currentlyInCollection.updateCardPositions();
        }
        card.currentlyInCollection = this;

        if (updateCardPositions) this.updateCardPositions();
    }

    updateCardPositions() {
        if (this.type == "hand") {
            for (let i = 0; i < this.cards.length; i++) {
                let card = this.cards[i];
                let posDelta =
                    i * this.spacing -
                    ((this.cards.length - 1) * this.spacing) / 2;
                let angleDelta =
                    i * this.anglePerCard -
                    ((this.cards.length - 1) * this.anglePerCard) / 2;
                let newAngle = this.angle + angleDelta;
                card.moveTo(
                    this.x +
                        posDelta * Math.cos((newAngle / 360) * Math.PI * 2),
                    this.y +
                        posDelta * Math.sin((newAngle / 360) * Math.PI * 2),
                    newAngle,
                    i * 0.1,
                    this.cardScale
                );
                card.setDepth(10 + i);
            }
        } else if (this.type == "radial") {
            for (let i = 0; i < this.cards.length; i++) {
                let card = this.cards[i];
                // let [x, y, a] = this.positionsWhenDropped.get(card)!;
                card.moveTo(
                    this.x +
                        Math.cos(
                            ((card.angle + this.angle) / 360) * Math.PI * 2
                        ) *
                            this.spacing,
                    this.y +
                        Math.sin(
                            ((card.angle + this.angle) / 360) * Math.PI * 2
                        ) *
                            this.spacing,
                    card.angle,
                    i * 0.1,
                    this.cardScale
                );
            }
        }
    }

    sortCards() {
        let noHearts = !this.cards.some((e) => e.suit == CardSuit.HEARTS);
        this.cards.sort(
            (a, b) =>
                (getCardSuitOrder(a.suit, noHearts) -
                    getCardSuitOrder(b.suit, noHearts)) *
                    100 +
                getCardOrder(a, false) -
                getCardOrder(b, false)
        );
        this.updateCardPositions();
    }
}

function getCardScore(card: Card, isTroef: boolean) {
    switch (card.value) {
        case 14: // ace
            return 11;
        case 13: // king
            return 3;
        case 12: // queen
            return 2;
        case 11: // jack
            return isTroef ? 20 : 1;
        case 10:
            return 10;
        case 9:
            return isTroef ? 14 : 0;
        case 8:
        case 7:
            return 0;
        default:
            console.error("Invalid card value", card.value);
            return 0;
    }
}

function getCardFattingOrder(card: Card, isTroef: boolean) {
    switch (card.value) {
        case 14: // ace
            return isTroef ? 6 : 15;
        case 13: // king
            return isTroef ? 5 : 14;
        case 12: // queen
            return isTroef ? 4 : 13;
        case 11: // jack
            return isTroef ? 3 : 12;
        case 10:
            return isTroef ? 8 : 16;
        case 9:
            return isTroef ? 7 : 11;
        case 8:
            return isTroef ? 2 : 10;
        case 7:
            return isTroef ? 1 : 9;
        default:
            console.error("Invalid card value", card.value);
            return 0;
    }
}

function getCardOrder(card: Card, isTroef: boolean) {
    switch (card.value) {
        case 14: // ace
            return isTroef ? 5 : 7;
        case 13: // king
            return isTroef ? 4 : 6;
        case 12: // queen
            return isTroef ? 3 : 5;
        case 11: // jack
            return isTroef ? 7 : 4;
        case 10:
            return isTroef ? 2 : 3;
        case 9:
            return isTroef ? 6 : 2;
        case 8:
            return 1;
        case 7:
            return 0;
        default:
            console.error("Invalid card value", card.value);
            return 0;
    }
}

function getHintingCard(
    onCards: Card[],
    availableCards: Card[],
    troef: CardSuit
): Card | null {
    const hintingCards = availableCards.filter(
        (e) =>
            (onCards.length === 0 || e.suit !== onCards[0].suit) &&
            e.suit !== troef
    );
    if (hintingCards.length <= 0) {
        return null;
    }

    const bestCard = max(hintingCards, (card) =>
        getCardOrder(card, card.suit === troef)
    )[0];

    const cardsFromSameBestSuit = availableCards.filter(
        (card) => card.suit === bestCard.suit
    );
    if (cardsFromSameBestSuit.length <= 1) {
        return null;
    }

    return min(cardsFromSameBestSuit, (card) =>
        getCardScore(card, card.suit === troef)
    )[0];
}

function cardGreaterThan(a: Card, b: Card, troef: CardSuit) {
    if (a.suit === troef && b.suit !== troef) {
        return true;
    } else if (a.suit !== troef && b.suit === troef) {
        return false;
    } else if (a.suit === troef && b.suit === troef) {
        return getCardOrder(a, true) > getCardOrder(b, true);
    } else {
        // if (a.suit !== troef && b.suit !== troef)
        return getCardOrder(a, false) > getCardOrder(b, false);
    }
}

function getNameForValue(value: number, multiple: boolean) {
    switch (value) {
        case 11:
            return multiple ? "zotten" : "zot";
        case 12:
            return multiple ? "wijven" : "vrouw";
        case 13:
            return multiple ? "heren" : "heer";
        case 14:
            return multiple ? "azen" : "aas";
        default:
            return String(value);
    }
}

interface IWijs {
    countsIfTroef(troef: CardSuit): boolean;
    getScore(): number;
    getCards(): Card[];
    toString(): string;
}

class CarreWijs implements IWijs {
    constructor(public cards: Card[]) {}

    getCards(): Card[] {
        return this.cards;
    }

    toString(): string {
        return (
            this.cards.length + " " + getNameForValue(this.cards[0].value, true)
        );
    }

    countsIfTroef(_troef: CardSuit): boolean {
        return true;
    }

    getScore(): number {
        return this.cards[0].value === 11 ? 200 : 100;
    }
}

class SequenceWijs implements IWijs {
    constructor(public cards: Card[]) {}

    getCards(): Card[] {
        return this.cards;
    }

    toString(): string {
        return this.cards.length + " op een rij";
    }

    getScore(): number {
        if (this.cards.length >= 5) return 100;
        if (this.cards.length == 4) return 50;
        if (this.cards.length == 3) return 20;
        return 0;
    }

    countsIfTroef(_troef: CardSuit): boolean {
        return true;
    }
}

class MarriageWijs implements IWijs {
    constructor(public cards: Card[]) {}

    countsIfTroef(troef: CardSuit): boolean {
        return this.cards[0].suit === troef;
    }

    getScore(): number {
        return 20;
    }

    toString(): string {
        return "Marriage";
    }

    getCards(): Card[] {
        return this.cards;
    }
}

function calculateWijs(cards: Card[]): IWijs[] {
    let wijs: IWijs[] = [];

    // Find sequences
    // 3 sequential cards -> +20
    // 4 sequential cards -> +50
    // 5 sequential cards -> +100
    cards = [...cards];
    cards.sort((a, b) => (a.suit - b.suit) * 100 + a.value - b.value);
    let seqCards: Card[] = [];
    for (let i = 0; i < cards.length; i++) {
        let card = cards[i];
        let nextCard = i + 1 == cards.length ? null : cards[i + 1];

        seqCards.push(card);

        if (
            !nextCard ||
            card.suit != nextCard.suit ||
            card.value !== nextCard.value - 1
        ) {
            // Sequence got broken
            // console.log(
            //     "seq broke",
            //     seqLen,
            //     seqCards.map((e) => e.toString())
            // );

            if (seqCards.length >= 3) wijs.push(new SequenceWijs(seqCards));
            seqCards = [];
        }
    }

    // Marriage
    // king + queen if troef -> +20
    for (let s = 0; s < 4; s++) {
        let troefQueen = cards.find((e) => e.value == 12 && e.suit == s);
        let troefKing = cards.find((e) => e.value == 13 && e.suit == s);
        if (troefQueen && troefKing) {
            wijs.push(new MarriageWijs([troefQueen, troefKing]));
        }
    }

    // 4 jacks -> +200
    // 4 queens/kings/aces -> +100
    [11, 12, 13, 14].forEach((v) => {
        let same = cards.filter((e) => e.value == v);
        if (same.length === 4) {
            wijs.push(new CarreWijs(same));
        }
    });

    return wijs;
}

function getWijsScore(wijs: IWijs[], troef: CardSuit) {
    let sum = 0;
    wijs.forEach((w) => {
        if (w.countsIfTroef(troef)) {
            sum += w.getScore();
        }
    });
    return sum;
}

function count<T>(arr: T[], predicate: (value: T) => boolean) {
    let count = 0;
    arr.forEach((e) => {
        if (predicate(e)) {
            count += 1;
        }
    });
    return count;
}

function min<T>(arr: T[], predicate: (value: T) => number): [T, number] {
    let min = Number.MAX_SAFE_INTEGER;
    let minItem = arr[0];
    arr.forEach((item) => {
        let itemValue = predicate(item);
        if (itemValue < min) {
            min = itemValue;
            minItem = item;
        }
    });
    return [minItem, min];
}

function max<T>(arr: T[], predicate: (value: T) => number): [T, number] {
    let max = Number.MIN_SAFE_INTEGER;
    let maxItem = arr[0];
    arr.forEach((item) => {
        let itemValue = predicate(item);
        if (itemValue > max) {
            max = itemValue;
            maxItem = item;
        }
    });
    return [maxItem, max];
}

function multipleMax<T>(
    arr: T[],
    predicate: (value: T) => number
): [T[], number] {
    let max = Number.MIN_SAFE_INTEGER;
    let maxItems: T[] = [];
    arr.forEach((item) => {
        let itemValue = predicate(item);
        if (itemValue > max) {
            maxItems = [item];
            max = itemValue;
        } else if (itemValue === max) {
            maxItems.push(item);
        }
    });
    return [maxItems, max];
}

function multipleMin<T>(
    arr: T[],
    predicate: (value: T) => number
): [T[], number] {
    let min = Number.MAX_SAFE_INTEGER;
    let minItems: T[] = [];
    arr.forEach((item) => {
        let itemValue = predicate(item);
        if (itemValue < min) {
            minItems = [item];
            min = itemValue;
        } else if (itemValue === min) {
            minItems.push(item);
        }
    });
    return [minItems, min];
}

function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(arr.length * Math.random())];
}

function sortCardsByValue(cards: Card[], ascending = true): Card[] {
    cards = [...cards];
    cards.sort((a, b) => (a.value - b.value) * (ascending ? 1 : -1));
    return cards;
}

function sortCardsByOrder(
    cards: Card[],
    troef: CardSuit,
    ascending = true
): Card[] {
    cards = [...cards];
    cards.sort(
        (a, b) =>
            (getCardOrder(a, a.suit === troef) -
                getCardOrder(b, b.suit === troef)) *
            (ascending ? 1 : -1)
    );
    return cards;
}

function sortCardsByScore(
    cards: Card[],
    troef: CardSuit,
    ascending = true
): Card[] {
    cards = [...cards];
    cards.sort(
        (a, b) =>
            (getCardScore(a, a.suit === troef) -
                getCardScore(b, b.suit === troef)) *
            (ascending ? 1 : -1)
    );
    return cards;
}

function getRecommendedOffer(
    cards: Card[],
    alreadyOfferedPlayers: Player[]
): [Card, number] | null {
    let wijs = calculateWijs(cards);

    const POINTS_AVAILABLE = 141;

    let offerPerSuit = new Map<CardSuit, number>();

    for (let troef = 0; troef < 4; troef++) {
        let wijsScore = 0;
        for (const w of wijs) {
            if (w.countsIfTroef(troef)) {
                wijsScore += w.getScore();
            }
        }

        const winningRounds = cards.filter(
            (card) => card.suit === troef || card.value === 14
        ).length;

        let pointsScore = winningRounds * (POINTS_AVAILABLE / 8);

        let offer = Math.floor((wijsScore + pointsScore) / 10) * 10;
        offerPerSuit.set(troef, offer);
    }

    console.log("offerPerSuit", offerPerSuit);

    let [[bestOfferSuit, bestOffer]] = max(
        Array.from(offerPerSuit.entries()),
        ([, offer]) => offer
    );

    if (bestOffer < 100) {
        return null;
    }

    if (alreadyOfferedPlayers.length > 2) {
        // Round to previous 50
        bestOffer = Math.floor(bestOffer / 50) * 50;
    }

    const troefCards = cards.filter((card) => card.suit === bestOfferSuit);

    const jack = troefCards.find((card) => card.value === 9);
    const nine = troefCards.find((card) => card.value === 9);
    if (jack && nine) {
        return [nine, bestOffer];
    }
    if (jack && !nine) {
        return [jack, bestOffer];
    }

    const ace = troefCards.find((card) => card.value === 14);
    if (!jack && nine && ace) {
        return [ace, bestOffer];
    }

    let minCard = min(troefCards, (card) => getCardScore(card, true))[0];
    return [minCard, bestOffer];
}

function getWinningCard(cards: Card[], troef: CardSuit): [Card, number] {
    let highestPlayedCard = cards[0];
    let highestPlayedOrder = -1;
    // let highestPlayedCardIndex = -1;
    if (cards.some((e) => e.suit === troef)) {
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            if (card.suit !== troef) {
                continue;
            }

            const order = getCardOrder(card, true);
            if (order > highestPlayedOrder) {
                highestPlayedCard = card;
                highestPlayedOrder = order;
                // highestPlayedCardIndex = i;
            }
        }
    } else {
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            if (card.suit !== cards[0].suit) {
                continue;
            }

            const order = getCardOrder(card, false);
            if (order > highestPlayedOrder) {
                highestPlayedCard = card;
                highestPlayedOrder = order;
                // highestPlayedCardIndex = i;
            }
        }
    }

    return [highestPlayedCard, highestPlayedOrder];
}

function isCardPlayable(
    alreadyPlayedCards: Card[],
    handCards: Card[],
    card: Card,
    troef: CardSuit | null
) {
    if (alreadyPlayedCards.length === 0 || troef === null) {
        return true;
    }
    if (card.suit === troef) {
        return true;
    }
    if (handCards.some((e) => e.suit === alreadyPlayedCards[0].suit)) {
        return card.suit === alreadyPlayedCards[0].suit;
    }
    return true;
}

function getPlayableCards(
    alreadyPlayedCards: Card[],
    handCards: Card[],
    troef: CardSuit | null
) {
    return handCards.filter((c) =>
        isCardPlayable(alreadyPlayedCards, handCards, c, troef)
    );
}

function printKnowledge(
    knowledge: Map<
        Player,
        {
            hasCards: Set<Card>;
            couldHaveCards: Set<Card>;
        }
    >
) {
    [...knowledge.entries()].forEach(([player, knowledge]) => {
        console.group("Player " + player.getName());

        console.group("Has");
        knowledge.hasCards.forEach((value) => console.log(value.toString()));
        console.groupEnd();

        console.group("Could have cards");
        knowledge.couldHaveCards.forEach((value) =>
            console.log(value.toString())
        );
        console.groupEnd();

        console.groupEnd();
    });
}

export class Player {
    hand: CardCollection;
    wonCards: CardCollection;
    nameText: Phaser.GameObjects.Text;
    offered: number | null = null;
    shouldStartWith: Card | null = null;
    // friendHint: Card | null = null;
    hinted = false;
    knowledgePerPlayer: Map<
        Player,
        {
            hint: Card | null;
            hasCards: Set<Card>;
            couldHaveCards: Set<Card>;
        }
    >;

    constructor(public game: GameScene, public index: number) {
        const EDGE_SPACING = 100;
        this.hand = new CardCollection(
            "hand",
            index == 0 || index == 2
                ? game.getWidth() / 2
                : index == 1
                ? EDGE_SPACING
                : game.getWidth() - EDGE_SPACING,
            index == 1 || index == 3
                ? game.getHeight() / 2
                : index == 2
                ? EDGE_SPACING
                : game.getHeight() - EDGE_SPACING,
            index == 3 ? -90 : index * 90
        );
        const WON_EDGE_SPACING = 370;
        this.wonCards = new CardCollection(
            "hand",
            index == 0 || index == 2
                ? game.getWidth() / 2
                : index == 1
                ? game.getWidth() / 2 - WON_EDGE_SPACING
                : game.getWidth() / 2 + WON_EDGE_SPACING,
            index == 1 || index == 3
                ? game.getHeight() / 2
                : index == 2
                ? game.getHeight() / 2 - WON_EDGE_SPACING
                : game.getHeight() / 2 + WON_EDGE_SPACING,
            index == 3 ? -90 : index * 90
        );
        this.wonCards.cardScale = CARD_SCALE / 2;
        this.wonCards.spacing = 20;
        this.wonCards.anglePerCard = 0;

        const TEXT_EDGE_SPACING = 230;
        this.nameText = game.add
            .text(
                index == 0 || index == 2
                    ? game.getWidth() / 2
                    : index == 1
                    ? TEXT_EDGE_SPACING
                    : game.getWidth() - TEXT_EDGE_SPACING,
                index == 1 || index == 3
                    ? game.getHeight() / 2
                    : index == 2
                    ? TEXT_EDGE_SPACING
                    : game.getHeight() - TEXT_EDGE_SPACING,
                "Player " + index
            )
            .setAngle(index == 2 ? 0 : index == 3 ? -90 : index * 90)
            .setAlign("center");
        this.game.children.add(this.nameText);

        this.knowledgePerPlayer = new Map();

        this.game.events.on("begindealing", () => {
            this.offered = null;
            this.shouldStartWith = null;
            this.hinted = false;
            // this.friendHint = null;
            this.knowledgePerPlayer.clear();
            this.game.players.forEach((player) => {
                this.knowledgePerPlayer.set(player, {
                    hint: null,
                    couldHaveCards: new Set(this.game.allCards),
                    hasCards: new Set(),
                });
            });
        });

        this.game.events.on("showswijs", (player: Player, wijs: IWijs[]) => {
            let knowledge = this.knowledgePerPlayer.get(player)!;

            wijs.forEach((w) => {
                w.getCards().forEach((card) => {
                    knowledge.hasCards.add(card);
                });

                if (
                    (w instanceof SequenceWijs || w instanceof MarriageWijs) &&
                    w.countsIfTroef(this.game.troef!)
                ) {
                    const sortedCards = sortCardsByValue(w.getCards());

                    const firstCard = sortedCards[0];
                    const cardBefore = this.game.allCards.find(
                        (e) =>
                            e.suit === firstCard.suit &&
                            e.value === firstCard.value - 1
                    );
                    if (cardBefore) {
                        knowledge.couldHaveCards.delete(cardBefore);
                    }

                    const lastCard = sortedCards[sortedCards.length - 1];
                    const cardAfter = this.game.allCards.find(
                        (e) =>
                            e.suit === lastCard.suit &&
                            e.value === lastCard.value + 1
                    );
                    if (cardAfter) {
                        knowledge.couldHaveCards.delete(cardAfter);
                    }
                }
            });

            // knowledge.hasCards.forEach((c) => {
            //     knowledge.doesntHaveCards.delete(c);
            // });
        });

        this.game.events.on("beginplay", () => {
            // Add hand cards (other players can't have them because you have them)
            this.game.players.forEach((player) => {
                const knowledge = this.knowledgePerPlayer.get(player)!;
                this.hand.cards.forEach((card) => {
                    knowledge.couldHaveCards.delete(card);
                });
            });

            const selfKnowledge = this.knowledgePerPlayer.get(this)!;
            selfKnowledge.couldHaveCards = new Set(this.hand.cards);
            selfKnowledge.hasCards = new Set(this.hand.cards);

            // if (this.index === 0) printKnowledge(this.knowledgePerPlayer);
        });

        this.game.events.on("cardplayed", (player: Player, card: Card) => {
            // console.log("Card was played");
            // this.rememberedPlayedCards.push(card);

            this.knowledgePerPlayer.forEach((knowledge) => {
                knowledge.hasCards.delete(card);
                knowledge.couldHaveCards.delete(card);
            });

            let bottomCard = this.game.dropZoneCollection.cards[0];
            if (
                card.suit !== bottomCard.suit &&
                (card.suit !== this.game.troef ||
                    bottomCard.suit === this.game.troef)
            ) {
                // Add all cards from suit
                let knowledge = this.knowledgePerPlayer.get(player)!;

                // Doesn't have suit, throws any card
                if (
                    this.isFriend(player) &&
                    knowledge.hint === null &&
                    card.value !== 10
                ) {
                    knowledge.hint = card;
                }

                this.game.allCards
                    .filter((e) => e.suit === bottomCard.suit)
                    .forEach((c) => {
                        // Jack doesn't have to follow
                        if (c.value === 11 && c.suit === this.game.troef) {
                            return;
                        }
                        knowledge.couldHaveCards.delete(c);
                        knowledge.hasCards.delete(c);
                    });
            }
        });
    }

    // getWinChanceAgainstPlayerForCard(
    //     enemyPlayer: Player,
    //     card: Card,
    //     troef: CardSuit
    // ) {
    //     const knowledgeAboutEnemy = this.knowledgePerPlayer.get(enemyPlayer)!;

    //     for (const hasCard of knowledgeAboutEnemy.hasCards) {
    //         if (cardGreaterThan(hasCard, card, troef)) {
    //             // This card can win, enemy player can win 100%
    //             return 0.0;
    //         }
    //     }

    //     let potentialWinningCards = 0;
    //     for (const maybeHasCard of knowledgeAboutEnemy.couldHaveCards) {
    //         if (cardGreaterThan(maybeHasCard, card, troef)) {
    //             // This card can win
    //             potentialWinningCards++;
    //             return 0.0; // TODO ???
    //         }
    //     }
    //     return (
    //         1.0 -
    //         potentialWinningCards / knowledgeAboutEnemy.couldHaveCards.size
    //     );
    // }

    /**
     * Returns the chances for each card the next players have them.
     */
    getNextCardsChances(
        nextPlayers: Player[]
    ): Map<Card, { chance: number; owners: Set<Player> }> {
        let nextPlayersHaveCards = new Set<Card>();
        let nextPlayersCouldHaveCards = new Set<Card>();
        for (const player of nextPlayers) {
            const knowledge = this.knowledgePerPlayer.get(player)!;
            for (const c of knowledge.hasCards) {
                // if (cardGreaterThan(c, card, troef))
                nextPlayersHaveCards.add(c);
            }
            for (const c of knowledge.couldHaveCards) {
                // if (cardGreaterThan(c, card, troef))
                nextPlayersCouldHaveCards.add(c);
            }
        }

        const previousPlayers = this.game.players.filter(
            (e) => !nextPlayers.includes(e) && e !== this
        );

        // let bestPotentialWinningCard: Card | null = null;
        const nextCardChances = new Map<
            Card,
            { chance: number; owners: Set<Player> }
        >();

        // for (const player of nextPlayers) {
        //     const knowledge = this.knowledgePerPlayer.get(player)!;
        //     for (const hasCard of knowledge.hasCards) {

        //     }
        // }
        for (const hasCard of nextPlayersHaveCards) {
            console.assert(
                !nextCardChances.has(hasCard),
                "!nextCardChances.has(hasCard)"
            );

            let playersThatHave = nextPlayers.filter((e) =>
                this.knowledgePerPlayer.get(e)!.hasCards.has(hasCard)
            );
            console.assert(
                playersThatHave.length === 1,
                "playersThatHave.length === 1"
            );

            nextCardChances.set(hasCard, {
                chance: 1.0,
                owners: new Set<Player>(playersThatHave),
            });
        }

        for (const potentialCard of nextPlayersCouldHaveCards) {
            // if (nextCardChances.has(potentialCard)) continue;

            let previousPlayerCountThatCouldHaveCard = 0;
            let previousPlayHasCard = false;
            for (const prevPlayer of previousPlayers) {
                const prevPlayerKnowledge =
                    this.knowledgePerPlayer.get(prevPlayer)!;

                if (prevPlayerKnowledge.hasCards.has(potentialCard)) {
                    previousPlayHasCard = true;
                    continue;
                }

                if (prevPlayerKnowledge.couldHaveCards.has(potentialCard))
                    previousPlayerCountThatCouldHaveCard++;
            }

            let nextPlayersThatCouldHave = nextPlayers.filter((e) =>
                this.knowledgePerPlayer
                    .get(e)!
                    .couldHaveCards.has(potentialCard)
            );

            if (previousPlayHasCard) {
                // console.assert(
                //     !nextCardChances.has(potentialCard),
                //     "!nextCardChances.has(potentialCard)"
                // );

                if (!nextCardChances.has(potentialCard))
                    nextCardChances.set(potentialCard, {
                        chance: 0.0,
                        owners: new Set(nextPlayersThatCouldHave),
                    });
                continue;
            }

            // console.assert(
            //     !nextCardChances.has(potentialCard),
            //     "!nextCardChances.has(potentialCard)"
            // );
            if (!nextCardChances.has(potentialCard))
                nextCardChances.set(potentialCard, {
                    chance:
                        1.0 -
                        previousPlayerCountThatCouldHaveCard /
                            (previousPlayers.length + 1),
                    owners: new Set(nextPlayersThatCouldHave),
                });
        }

        return nextCardChances;

        // if (bestPotentialWinningCard === null) {
        //     return ["me", 1.0];
        // }

        // let bestPotentialWinningCardWinChance =
        //     nextPlayersHaveWinningCardChanges.get(bestPotentialWinningCard)!;

        // if (bestPotentialWinningCard.originalOwner.isFriend(this)) {
        //     return ["friend", bestPotentialWinningCardWinChance];
        // } else {
        //     return ["me", 1.0 - bestPotentialWinningCardWinChance];
        // }
    }

    getRecommendedPlayCard3(
        nextPlayers: Player[],
        onCards: Card[],
        troef: CardSuit
    ): Card {
        // const nextFriendPlayer = nextPlayers.find((e) => e.isFriend(this));

        const nextCardsChances = this.getNextCardsChances(nextPlayers);

        // if (nextFriendPlayer) {
        //     // Friend still has to play
        //     const friendKnowledge =
        //         this.knowledgePerPlayer.get(nextFriendPlayer)!;
        //     // friendKnowledge.couldHaveCard
        // }

        for (const [k, v] of nextCardsChances.entries()) {
            console.log(
                "Next card chance",
                k.toString(),
                (v.chance * 100).toFixed(1),
                Array.from(v.owners)
                    .map((e) => e.getName())
                    .join("|")
            );
        }

        const playableCards = this.hand.cards.filter((card) =>
            isCardPlayable(onCards, this.hand.cards, card, troef)
        );

        const currentlyWinningCard =
            onCards.length > 0 ? getWinningCard(onCards, troef)[0] : null;

        if (
            currentlyWinningCard !== null &&
            currentlyWinningCard.originalOwner.isFriend(this)
        ) {
            return max(playableCards, (card) =>
                getCardFattingOrder(card, card.suit === troef)
            )[0];
        }

        const chancesPerCard: {
            card: Card;
            winChance: number;
            who: "me" | "friend";
            desc?: string;
        }[] = [];

        const friendPlayer = this.game.getPlayer(this.getFriendIndex());

        for (const playCard of playableCards) {
            const playCardCurrentlyWins =
                currentlyWinningCard === null
                    ? true
                    : cardGreaterThan(playCard, currentlyWinningCard, troef);

            // if (currentlyWinningCard !== null && !cardGreaterThan(playCard, currentlyWinningCard, troef)) {
            //     // Cannot win using card
            //     continue;
            // }

            const winningNextCards = new Map(
                Array.from(nextCardsChances.entries()).filter(
                    ([card]) =>
                        (currentlyWinningCard === null
                            ? true
                            : cardGreaterThan(
                                  card,
                                  currentlyWinningCard,
                                  troef
                              )) && cardGreaterThan(card, playCard, troef)
                )
            );

            if (winningNextCards.size <= 0) {
                chancesPerCard.push({
                    card: playCard,
                    who: "me",
                    winChance: playCardCurrentlyWins ? 1.0 : 0.0,
                    desc: playCard.toString(),
                });
                continue;
            }

            const [bestNextWinningCard] = getWinningCard(
                Array.from(winningNextCards.keys()),
                troef
            );
            const bestWinningCardStats =
                winningNextCards.get(bestNextWinningCard)!;

            if (bestWinningCardStats.owners.has(friendPlayer)) {
                // Friend could have this card
                const friendHasWinningCardChance =
                    bestWinningCardStats.chance /
                    bestWinningCardStats.owners.size;

                chancesPerCard.push({
                    card: playCard,
                    who: "friend",
                    winChance: friendHasWinningCardChance,
                    desc: playCard.toString(),
                });
            } else {
                chancesPerCard.push({
                    card: playCard,
                    who: "me",
                    winChance: playCardCurrentlyWins
                        ? 1.0 - bestWinningCardStats.chance
                        : 0.0,
                    desc: playCard.toString(),
                });
            }
        }

        console.log("chances per card", chancesPerCard);

        const [bestCardsToPlay, bestCardsToPlayWinChance] = multipleMax(
            chancesPerCard,
            (c) => c.winChance
        );

        console.log("best cards", bestCardsToPlay, bestCardsToPlayWinChance);

        // First help yourself, then your friend
        const helpMyselfMoves = bestCardsToPlay.filter((e) => e.who === "me");
        if (helpMyselfMoves.length > 0) {
            if (bestCardsToPlayWinChance > 0.5) {
                return max(helpMyselfMoves, (move) =>
                    getCardScore(move.card, move.card.suit === troef)
                )[0].card;
            } else {
                let hint = getHintingCard(onCards, playableCards, troef);
                if (hint) return hint;

                return min(helpMyselfMoves, (move) =>
                    getCardScore(move.card, move.card.suit === troef)
                )[0].card;
            }
        }

        const helpFriendMoves = bestCardsToPlay;

        if (bestCardsToPlayWinChance > 0.5) {
            return max(helpFriendMoves, (move) =>
                getCardFattingOrder(move.card, move.card.suit === troef)
            )[0].card;
        } else {
            const friendKnowledge = this.knowledgePerPlayer.get(friendPlayer)!;
            if (
                friendKnowledge.hint &&
                Array.from(friendKnowledge.couldHaveCards).some(
                    (card) => card.suit === friendKnowledge.hint!.suit
                )
            ) {
                const friendHelpCards = Array.from(playableCards).filter(
                    (e) => e.suit === friendKnowledge.hint!.suit
                );
                if (friendHelpCards.length > 0) {
                    console.log("Return card from hint", friendHelpCards);
                    return max(friendHelpCards, (card) =>
                        getCardFattingOrder(card, card.suit === troef)
                    )[0];
                }
            }

            let hint = getHintingCard(onCards, playableCards, troef);
            if (hint) return hint;

            return min(helpFriendMoves, (move) =>
                getCardFattingOrder(move.card, move.card.suit === troef)
            )[0].card;
        }
    }

    // getChancePlayerHasCard(player: Player, card: Card) {
    //     const knowledge = this.knowledgePerPlayer.get(player)!;
    //     if (knowledge.hasCards.has(card)) {
    //         return 1.0;
    //     }
    //     if (!knowledge.couldHaveCards.has(card)) {
    //         return 0.0;
    //     }

    //     let otherPlayerCountThatCouldHave = 0;
    //     let otherPlayerCount = 0;

    //     for (const [
    //         otherPlayer,
    //         otherKnowledge,
    //     ] of this.knowledgePerPlayer.entries()) {
    //         if (otherPlayer === player) {
    //             continue;
    //         }
    //         if (otherKnowledge.hasCards.has(card)) {
    //             return 0.0;
    //         }

    //         otherPlayerCount++;
    //         if (otherKnowledge.couldHaveCards.has(card)) {
    //             otherPlayerCountThatCouldHave++;
    //         }
    //     }

    //     return 1.0 - otherPlayerCountThatCouldHave / otherPlayerCount;
    // }

    // thinkOneOfPlayersHasCard(
    //     players: Player[],
    //     card: Card
    // ): boolean | undefined {
    //     for (const player of players) {
    //         const hasCard = this.thinkPlayerHasCard(player, card);
    //         if (hasCard === true) {
    //             return true;
    //         }
    //         if (hasCard === undefined) {
    //             return undefined;
    //         }
    //     }
    //     return false;
    // }

    // thinkPlayerHasCard(player: Player, card: Card): boolean | undefined {
    //     const knowledge = this.knowledgePerPlayer.get(player)!;
    //     if (knowledge.hasCards.has(card)) {
    //         console.assert(
    //             !knowledge.doesntHaveCards.has(card),
    //             "!knowledge.doesntHaveCards.has(card)"
    //         );
    //         return true;
    //     }
    //     if (knowledge.doesntHaveCards.has(card)) {
    //         console.assert(
    //             !knowledge.hasCards.has(card),
    //             "!knowledge.hasCards.has(card)"
    //         );
    //         return false;
    //     }
    //     return undefined;
    // }

    getName() {
        return "Player " + this.index;
    }

    getFriendIndex() {
        return (this.index + 2) % 4;
    }

    isFriend(ofPlayer: Player) {
        return ofPlayer.index === this.getFriendIndex();
    }

    // getRecommendedPlayCard2(
    //     nextPlayers: Player[],
    //     onCards: Card[],
    //     troef: CardSuit
    // ): Card {
    //     const playableCards = this.hand.cards.filter((card) =>
    //         isCardPlayable(onCards, this.hand.cards, card, troef)
    //     );

    //     let winningPlayableCards = playableCards;
    //     if (onCards.length > 0) {
    //         const [highestPlayedCard, highestPlayedOrder] = getWinningCard(
    //             onCards,
    //             troef
    //         );

    //         if (highestPlayedCard.originalOwner.isFriend(this)) {
    //             // Friend is winning, fat
    //             const chanceFriendWins = this.getNextCardsChances(
    //                 nextPlayers,
    //                 highestPlayedCard,
    //                 troef
    //             );

    //             console.log(
    //                 "Friend is winning with win chance",
    //                 chanceFriendWins
    //             );

    //             if (chanceFriendWins > 0.5) {
    //                 // Help friend by fatting
    //                 const [sortedFattingCards] = multipleMax(
    //                     playableCards,
    //                     (card) => getCardFattingOrder(card, card.suit === troef)
    //                 );

    //                 console.log(
    //                     "Fat with one of",
    //                     sortedFattingCards.map((e) => e.toString()).join("|")
    //                 );

    //                 return pickRandom(sortedFattingCards);
    //             }
    //         }

    //         winningPlayableCards = playableCards.filter((e) =>
    //             cardGreaterThan(e, highestPlayedCard, troef)
    //         );
    //     }

    //     if (winningPlayableCards.length > 0) {
    //         const [bestCards, bestCardWinChance] = multipleMax(
    //             winningPlayableCards,
    //             (card) => this.getNextCardsChances(nextPlayers, card, troef)
    //         );

    //         console.log(
    //             "Win chance with",
    //             bestCards.map((e) => e.toString()).join("|"),
    //             "is",
    //             bestCardWinChance * 100,
    //             "percent (best)"
    //         );

    //         if (bestCardWinChance > 0.5) {
    //             const [bestCardWithLeastValue] = min(bestCards, (card) =>
    //                 getCardOrder(card, card.suit === troef)
    //             );
    //             return bestCardWithLeastValue;
    //         }

    //         // if (bestCardWinChance > 0.5) {
    //         //     return pickRandom(bestCards);
    //         // }
    //     }

    //     // throw away bad card / or help friend
    //     const nextFriend = nextPlayers.find((pl) => this.isFriend(pl));
    //     if (nextFriend) {
    //         // Friend still has to play
    //         const friendKnowledge = this.knowledgePerPlayer.get(nextFriend)!;
    //         // friendKnowledge.hasCards.
    //         if (
    //             friendKnowledge.hint &&
    //             Array.from(friendKnowledge.couldHaveCards).some(
    //                 (e) => e.suit === friendKnowledge.hint!.suit
    //             )
    //         ) {
    //             // Use hinted suit
    //             const friendHelpCards = playableCards.filter(
    //                 (e) => e.suit === friendKnowledge.hint!.suit
    //             );

    //             const [bestFriendHelpCards, bestFriendCardWinChance] =
    //                 multipleMax(friendHelpCards, (card) =>
    //                     this.getNextCardsChances(nextPlayers, card, troef)
    //                 );

    //             console.log(
    //                 "Best friend fatting chance",
    //                 bestFriendCardWinChance,
    //                 "for cards",
    //                 bestFriendHelpCards.map((e) => e.toString).join("|")
    //             );

    //             if (
    //                 bestFriendCardWinChance > 0.5 &&
    //                 friendHelpCards.length > 0
    //             ) {
    //                 const [sortedFattingCards] = multipleMax(
    //                     bestFriendHelpCards,
    //                     (card) => getCardFattingOrder(card, card.suit === troef)
    //                 );

    //                 console.log(
    //                     "Fat with one of",
    //                     sortedFattingCards.map((e) => e.toString()).join("|")
    //                 );

    //                 return pickRandom(sortedFattingCards);
    //             }
    //         }
    //     }

    //     const [leastScoreCards] = multipleMin(playableCards, (card) =>
    //         getCardScore(card, card.suit === troef)
    //     );
    //     return min(leastScoreCards, (card) =>
    //         getCardOrder(card, card.suit === troef)
    //     )[0];
    //     // return pickRandom(leastScoreCards);
    // }

    // getRecommendedPlayCard(onCards: Card[], troef: CardSuit) {
    //     if (onCards.length === 0) {
    //         if (this.friendHint) {
    //             const friendCards = this.hand.cards.filter(
    //                 (e) => e.suit === this.friendHint!.suit
    //             );
    //             if (friendCards.length > 0) {
    //                 // Put card with highest score first
    //                 friendCards.sort(
    //                     (a, b) =>
    //                         getCardScore(b, b.suit === troef) -
    //                         getCardScore(a, a.suit === troef)
    //                 );

    //                 return friendCards[0];
    //             }
    //         }

    //         const playableCards = [...this.hand.cards];
    //         // Put highest order first
    //         playableCards.sort(
    //             (a, b) =>
    //                 getCardOrder(b, b.suit === troef) -
    //                 getCardOrder(a, a.suit === troef)
    //         );
    //         return playableCards[0];
    //     }

    //     let scoreInCards = 0;
    //     onCards.forEach((e) => {
    //         scoreInCards += getCardScore(e, e.suit === troef);
    //     });

    //     const [highestPlayedCard, highestPlayedOrder] = getWinningCard(
    //         onCards,
    //         troef
    //     );

    //     const playableWinCards = this.hand.cards.filter(
    //         (e) =>
    //             (e.suit === troef && highestPlayedCard.suit !== troef) ||
    //             (e.suit === highestPlayedCard.suit &&
    //                 getCardOrder(e, e.suit === troef) > highestPlayedOrder)
    //     );
    //     // Put the highest order first
    //     playableWinCards.sort(
    //         (a, b) =>
    //             getCardOrder(b, b.suit === troef) -
    //             getCardOrder(a, a.suit === troef)
    //     );

    //     let friendWillProbablyWin = false;
    //     if (
    //         onCards.length <= 1 &&
    //         this.friendHint !== null &&
    //         onCards[0].suit === this.friendHint.suit
    //     ) {
    //         friendWillProbablyWin = true;
    //     }

    //     if (highestPlayedCard.originalOwner.isFriend(this)) {
    //         friendWillProbablyWin = true;
    //     }

    //     if (!friendWillProbablyWin && playableWinCards.length > 0) {
    //         // You could win this, buy or nah?
    //         if (playableWinCards[0].suit !== onCards[0].suit) {
    //             // You can buy, want to proceed?
    //             if (scoreInCards > 10) {
    //                 return playableWinCards[0];
    //             }
    //         } else {
    //             // Ez win
    //             return playableWinCards[0];
    //         }
    //     }

    //     // Play lowest card (follow if possible) (fat if friend will probably win)
    //     let playableCards = getPlayableCards(onCards, this.hand.cards, troef);
    //     // if (playableCards.length <= 0) {
    //     //     playableCards = [...this.hand.cards];
    //     // }
    //     if (friendWillProbablyWin) {
    //         // Put card with highest score first
    //         playableCards.sort(
    //             (a, b) =>
    //                 getCardScore(b, b.suit === troef) -
    //                 getCardScore(a, a.suit === troef)
    //         );
    //     } else {
    //         // Put card with lowest score first
    //         playableCards.sort(
    //             (a, b) =>
    //                 getCardScore(a, a.suit === troef) -
    //                 getCardScore(b, b.suit === troef)
    //         );
    //     }

    //     // playableCards.sort(
    //     //     (a, b) =>
    //     //         (a.value === 10
    //     //             ? friendWillProbablyWin
    //     //                 ? 0
    //     //                 : 13.5
    //     //             : a.value) -
    //     //         (b.value === 10 ? (friendWillProbablyWin ? 0 : 13.5) : b.value));

    //     return playableCards[0];
    // }
}

export class GameScene extends Scene {
    currentlyDragging!: Phaser.GameObjects.Sprite;
    testKey: Phaser.Input.Keyboard.Key;

    troef: CardSuit | null = null;
    troefText: Phaser.GameObjects.Text;
    allCards: Card[];
    players: Player[];
    dropZone: Phaser.GameObjects.GameObject;
    dropZoneText: Phaser.GameObjects.Text;
    dropZoneCollection: CardCollection;
    // team1Cards: CardCollection;
    // team2Cards: CardCollection;
    playerTurnTriangle: Phaser.GameObjects.Shape;
    dealerPlayerIndex = 0;
    turnPlayerIndex = 0;
    startedTurnPlayerIndex = 0;

    constructor() {
        super("GameScene");
    }

    preload() {
        this.load.image("cards", "assets/cards.png");
        this.load.spritesheet("card", "assets/cards.png", {
            frameWidth: CARD_WIDTH,
            frameHeight: CARD_HEIGHT,
        });
    }

    returnCardsToDealerDeckAndDeal() {
        let newAllCards: Card[] = [];

        [...this.dropZoneCollection.cards].forEach((card) => {
            if (card.currentlyInCollection) {
                card.currentlyInCollection.removeCard(card);
                card.currentlyInCollection = undefined;
            }
            card.moveTo(this.getWidth() / 2, this.getHeight() / 2, 0);
            card.setDepth(10);
            card.setFaceDown(true);
            newAllCards.push(card);
        });

        for (let p = 0; p < this.players.length; p++) {
            let player = this.players[p];
            let playerCards = [...player.hand.cards, ...player.wonCards.cards];
            for (let i = 0; i < playerCards.length; i++) {
                let card = playerCards[i];
                if (card.currentlyInCollection) {
                    card.currentlyInCollection.removeCard(card);
                    card.currentlyInCollection = undefined;
                }
                card.moveTo(this.getWidth() / 2, this.getHeight() / 2, 0);
                card.setDepth(10 + i);
                card.setFaceDown(true);
                newAllCards.push(card);
            }
        }

        // Do 1 deck cut
        let cuts = 2;
        for (let i = 0; i < cuts; i++) {
            let cutIndex =
                Math.floor(Math.random() * (newAllCards.length - 8)) + 4;
            newAllCards = [
                ...newAllCards.slice(cutIndex),
                ...newAllCards.slice(0, cutIndex),
            ];
        }

        this.allCards = newAllCards;

        this.time.delayedCall(1000, () => {
            this.dealCards();
        });

        // for (let i = 0; i < this.allCards.length; i++) {
        //     let card = this.allCards[i];
        //     if (card.currentlyInCollection) {
        //         card.currentlyInCollection.removeCard(card);
        //         card.currentlyInCollection = undefined;
        //     }
        //     card.moveTo(window.innerWidth / 2, window.innerHeight / 2, 0);
        //     card.setDepth(10 + i);
        //     card.setFaceDown(true);
        // }
    }

    shuffleCards() {
        // Shuffle
        for (let i = 0; i < this.allCards.length; i++) {
            let r = Math.floor(Math.random() * this.allCards.length);
            let t = this.allCards[i];
            this.allCards[i] = this.allCards[r];
            this.allCards[r] = t;
        }
    }

    getDealer() {
        return this.players[this.dealerPlayerIndex]!;
    }

    getPlayer(idx: number) {
        if (idx < 0 || idx >= 4) {
            throw new Error("getPlayer invalid index " + idx);
        }
        return this.players[idx];
    }

    dealCards() {
        this.troef = null;
        this.events.emit("begindealing");

        // Deal cards
        const DEAL_INTERVAL = 50;
        for (let i = 0; i < this.allCards.length; i++) {
            this.time.delayedCall(i * DEAL_INTERVAL, () => {
                let card = this.allCards[i];
                let targetPlayerIdx = Math.floor((i / 4) % 4);
                if (targetPlayerIdx == 0) card.setFaceDown(false);
                this.players[targetPlayerIdx].hand.addCard(card);
                card.originalOwner = this.players[targetPlayerIdx];
            });
        }

        this.time.delayedCall(
            this.allCards.length * DEAL_INTERVAL + 100,
            () => {
                let sortHandForPlayers = [0, 1, 2, 3];
                sortHandForPlayers.forEach((playerIndex) => {
                    this.players[playerIndex].hand.sortCards();
                });

                // let helpHandForPlayers = [0, 1, 2, 3];
                let helpHandForPlayers = [0];
                helpHandForPlayers.forEach((playerIndex) => {
                    console.log("All cards are dealt!");
                    let wijs = calculateWijs(
                        this.players[playerIndex].hand.cards
                    );
                    console.log("Player %d wijs", playerIndex, wijs);

                    this.time.delayedCall(500, () => {
                        wijs.forEach((w, i) => {
                            if (w instanceof MarriageWijs) {
                                return;
                            }
                            w.getCards().forEach((wijsCard) => {
                                wijsCard.mark(
                                    50,
                                    Phaser.Math.Easing.Cubic.Out,
                                    i * 100
                                );
                            });
                        });
                    });
                });

                this.playerBeginOffer((this.dealerPlayerIndex + 1) % 4);
            }
        );
    }

    getWidth() {
        return this.sys.game.scale.gameSize.width;
    }

    getHeight() {
        return this.sys.game.scale.gameSize.height;
    }

    create() {
        this.players = [];
        for (let i = 0; i < 4; i++) {
            this.players.push(new Player(this, i));
        }

        // console.log("size", this.sys.game.scale.gameSize);

        this.allCards = [];
        for (let s = 0; s < 4; s++) {
            for (let v = 7; v <= 14; v++) {
                let card = new Card(
                    this,
                    this.getWidth() / 2,
                    this.getHeight() / 2,
                    s,
                    v,
                    true
                );
                this.allCards.push(card);
                this.children.add(card);
            }
        }

        this.dropZoneCollection = new CardCollection(
            "radial",
            this.getWidth() / 2,
            this.getHeight() / 2,
            90
        );
        this.dropZoneCollection.spacing = 150;

        this.playerTurnTriangle = this.add.triangle(
            this.getWidth() / 2,
            this.getHeight() / 2,
            0 + 30,
            30 + 30,
            -30 + 30,
            -30 + 30,
            30 + 30,
            -30 + 30,
            0xbbbbbb
        );

        // this.playerTurnTriangle = this.add.rectangle(
        //     window.innerWidth / 2,
        //     window.innerHeight / 2,
        //     60,
        //     60,

        //     0xaaaaaa
        // );
        this.playerTurnTriangle.setDepth(20);

        // this.playerTurnTriangle.x

        this.input.keyboard!.on("keydown-A", () => {
            this.returnCardsToDealerDeckAndDeal();
        });

        // let counter = 0;
        // this.input.keyboard!.on("keydown-A", () => {
        //     for (let i = 0; i < 4; i++) {
        //         let card = new Card(
        //             this,
        //             100,
        //             100,
        //             Math.floor(counter / 13),
        //             (counter % 13) + 2,
        //             false
        //         );

        //         this.children.add(card);
        //         this.players[i].hand.addCard(card);
        //     }

        //     counter++;
        // });

        this.dropZone = this.add
            .rectangle(
                this.getWidth() / 2,
                this.getHeight() / 2,
                500,
                500,
                0x222222
            )
            .setDepth(1)
            .setInteractive({
                dropZone: true,
            } as Phaser.Types.Input.InputConfiguration);

        // These don't work (i don't get why?)
        // this.dropZone.on("dragenter", () => {
        //     console.log("dragenter");
        // });
        // this.dropZone.on("dragleave", () => {
        //     console.log("dragleave");
        // });
        // this.dropZone.on("dragover", (ev: any, x, y) => {
        //     console.log("dragover", ev, x, y);
        // });

        // this.add.sprite(30, 60, "card", 10);

        this.dropZoneText = this.add
            .text(
                this.getWidth() / 2,
                this.getHeight() / 2,
                "Sleep kaart\nhier",
                {
                    fontFamily: "Arial Black",
                    fontSize: 38,
                    color: "#aaaaaa",
                    // stroke: "#000000",
                    // strokeThickness: 8,
                    align: "center",
                }
            )
            .setOrigin(0.5)
            .setDepth(2);

        this.troefText = this.add
            .text(
                this.getWidth() / 2 - 300,
                this.getHeight() / 2 - 300,
                "Troef = ?",
                {
                    fontFamily: "Arial Black",
                    fontSize: 24,
                    color: "#aaaaaa",
                    // stroke: "#000000",
                    // strokeThickness: 8,
                    align: "center",
                }
            )
            .setOrigin(0.5)
            .setDepth(2);

        this.input.on("drop", (_ev: any, dropped: any, droppedOn: any) => {
            if (dropped instanceof Card && this.dropZone == droppedOn) {
                // console.log("card got dropped on dropzone", dropped);

                this.playCard(this.players[0], dropped);
                // this.dropZoneCollection.addCard(dropped, false);
                // this.events.emit("cardplayed", dropped);
            }
        });

        // this.events.on("cardplayed", (player: Player, card: Card) => {

        // });

        this.shuffleCards();
        this.dealCards();

        EventBus.emit("current-scene-ready", this);
    }

    updateCurrentPlayerTriangle(angle: number) {
        this.tweens.add({
            targets: this.playerTurnTriangle,
            duration: 200,
            angle:
                this.playerTurnTriangle.angle +
                Phaser.Math.Angle.ShortestBetween(
                    this.playerTurnTriangle.angle,
                    angle
                ),
            ease: Phaser.Math.Easing.Back.InOut,
            onUpdate: (_tween, _target, _key, current) => {
                const DISTANCE = 280;
                const ang = current + 90;
                this.playerTurnTriangle.x =
                    this.getWidth() / 2 +
                    Math.cos((ang / 360) * Math.PI * 2) * DISTANCE;
                this.playerTurnTriangle.y =
                    this.getHeight() / 2 +
                    Math.sin((ang / 360) * Math.PI * 2) * DISTANCE;
            },
        });
    }

    playCard(player: Player, card: Card) {
        if (player.hand !== card.currentlyInCollection) {
            console.error("Card was played by invalid player");
            return;
        }
        if (player.index !== this.turnPlayerIndex) {
            console.error("Card was played by player that is not at turn");
            return;
        }
        if (
            !isCardPlayable(
                this.dropZoneCollection.cards,
                player.hand.cards,
                card,
                this.troef
            )
        ) {
            console.error("Card is not playable");
            return;
        }

        player.hand.cards.forEach((card) => {
            card.setEnabled(true);
        });

        this.dropZoneCollection.addCard(card);
        card.setFaceDown(false);

        let shouldShowWijs = false;

        if (this.troef === null) {
            console.warn("Set troef to %s", card.toString());
            this.troef = card.suit;
            shouldShowWijs = true;
        }

        let nextPlayerPlaysAt = 0;

        if (shouldShowWijs) {
            const wijs = calculateWijs(player.hand.cards);
            const wijsScore = getWijsScore(wijs, this.troef!);

            console.log("Player", player, "shows wijs", wijsScore);

            this.events.emit("showswijs", player, wijs);

            if (player !== this.getLocalPlayer()) {
                const WIJS_SHOW_TIME = 3000;

                nextPlayerPlaysAt += wijs.length * WIJS_SHOW_TIME;

                wijs.forEach((w, i) => {
                    if (!w.countsIfTroef(this.troef!)) {
                        return;
                    }

                    this.time.delayedCall(i * WIJS_SHOW_TIME, () => {
                        w.getCards().forEach((card) => {
                            card.setFaceDown(false);
                            card.mark(25);
                        });

                        this.time.delayedCall(WIJS_SHOW_TIME - 500, () => {
                            w.getCards().forEach((card) => {
                                card.setFaceDown(
                                    player !== this.getLocalPlayer()
                                );
                                card.stopMark(false);
                            });
                        });
                    });
                });
            }
        }

        if (this.dropZoneCollection.cards.length >= 4) {
            console.log("End of round, who won?");
            const [highestCard, _highestCardScore] = getWinningCard(
                this.dropZoneCollection.cards,
                this.troef!
            );

            console.log(
                "getwinningcard %s = %s",
                this.dropZoneCollection.cards
                    .map((e) => e.toString())
                    .join(","),
                highestCard.toString()
            );

            console.log(
                "Player %d won with",
                highestCard.originalOwner.index,
                highestCard.toString()
            );

            this.time.delayedCall(nextPlayerPlaysAt + 1000, () => {
                [...this.dropZoneCollection.cards].forEach((card) => {
                    highestCard.originalOwner.wonCards.addCard(card);
                });
            });

            this.time.delayedCall(nextPlayerPlaysAt + 2000, () => {
                if (highestCard.originalOwner.hand.cards.length <= 0) {
                    console.log("End of game!");
                } else {
                    this.playerBeginPlay(highestCard.originalOwner.index);
                }
            });
        } else {
            this.time.delayedCall(nextPlayerPlaysAt + 500, () => {
                this.playerBeginPlay((this.turnPlayerIndex + 1) % 4);
            });
        }

        this.events.emit("cardplayed", player, card);
    }

    getLocalPlayer() {
        return this.players[0];
    }

    putOffer(player: Player, offer: number | null) {
        if (player.offered !== null) {
            console.error("player.offered !== null during putOffer");
        }

        if (offer != null) {
            player.offered = offer;
        }

        console.log(
            "Player %d offers %s (should start with %s)",
            player.index,
            player.offered,
            player.shouldStartWith
                ? player.shouldStartWith.toString()
                : "nothing"
        );

        if (player.index == this.dealerPlayerIndex) {
            console.log("All players offered, start");
            let highestOfferPlayer: Player | null = null;
            this.players.forEach((player) => {
                if (player.offered !== null) {
                    if (
                        highestOfferPlayer === null ||
                        player.offered > highestOfferPlayer.offered!
                    ) {
                        highestOfferPlayer = player;
                    }
                }
            });

            if (highestOfferPlayer === null) {
                // console.log("Nobody proposed an offer");
                // alert("Niemand heeft geboden! Opnieuw schudden");
                this.returnCardsToDealerDeckAndDeal();
            } else {
                highestOfferPlayer = highestOfferPlayer as Player;

                console.log(
                    "Player has the highest offer",
                    highestOfferPlayer.index,
                    highestOfferPlayer.offered,
                    highestOfferPlayer.shouldStartWith!.toString()
                );

                this.players.forEach((pl) => {
                    pl.hand.cards.forEach((c) => {
                        c.stopMark(false);
                    });
                });

                this.startedTurnPlayerIndex = highestOfferPlayer.index;
                this.events.emit("beginplay");
                this.playerBeginPlay(this.startedTurnPlayerIndex);
            }
            return;
        } else {
            this.playerBeginOffer((player.index + 1) % 4);
        }
    }

    playerBeginOffer(playerIndex: number) {
        let player = this.players[playerIndex];

        this.setTriangleToPlayer(playerIndex);

        let alreadyOfferedPlayers: Player[] = [];
        for (let i = 0; i < 4; i++) {
            const pl = this.players[(this.dealerPlayerIndex + 1 + i) % 4];
            if (pl.index === playerIndex) {
                break;
            }
            alreadyOfferedPlayers.push(pl);
        }

        let recommendedOffer = getRecommendedOffer(
            player.hand.cards,
            alreadyOfferedPlayers
        );

        if (recommendedOffer != null) {
            player.shouldStartWith = recommendedOffer[0];
        }

        if (player.index === 0) {
            // Local player
            console.log("Local player should offer", recommendedOffer);

            this.events.emit(
                "shouldoffer",
                player,
                recommendedOffer == null ? null : recommendedOffer[0].suit,
                recommendedOffer == null ? null : recommendedOffer[1],
                alreadyOfferedPlayers
            );
        } else {
            this.time.delayedCall(1000, () => {
                this.putOffer(
                    player,
                    recommendedOffer == null ? null : recommendedOffer[1]
                );
            });
        }
    }

    playerTriangleAngle = 0;

    setTriangleToPlayer(playerIndex: number) {
        this.playerTriangleAngle = playerIndex * 90;
        this.updateCurrentPlayerTriangle(this.playerTriangleAngle);
    }

    triangleGotoNextPlayer() {
        this.playerTriangleAngle += 90;
        if (this.playerTriangleAngle >= 360) this.playerTriangleAngle = 0;
        this.updateCurrentPlayerTriangle(this.playerTriangleAngle);
    }

    playerBeginPlay(playerIndex: number) {
        this.turnPlayerIndex = playerIndex;
        const player = this.players[playerIndex];

        this.setTriangleToPlayer(playerIndex);

        const nextPlayers = [] as Player[];
        for (let i = 1; i < 4 - this.dropZoneCollection.cards.length; i++) {
            nextPlayers.push(this.players[(playerIndex + i) % 4]);
        }

        let recommendedCard: Card;
        if (this.troef === null) {
            recommendedCard = player.shouldStartWith!;
        } else {
            recommendedCard = player.getRecommendedPlayCard3(
                nextPlayers,
                this.dropZoneCollection.cards,
                this.troef!
            );
        }

        if (playerIndex === 0) {
            // Local player

            recommendedCard.mark(25);

            player.hand.cards.forEach((card) => {
                card.setEnabled(
                    isCardPlayable(
                        this.dropZoneCollection.cards,
                        player.hand.cards,
                        card,
                        this.troef
                    )
                );
            });

            console.log(
                "Local player should play, recommended card is",
                recommendedCard.toString(),
                "For troef: " +
                    CardSuit[this.troef ?? player.shouldStartWith!.suit]
            );
            printKnowledge(player.knowledgePerPlayer);

            return;
        }

        // if (this.troef === null) {
        //     console.warn("Set troef to", player.shouldStartWith!.toString());
        //     this.troef = player.shouldStartWith!;
        // }

        this.time.delayedCall(500, () => {
            this.playCard(player, recommendedCard);
        });
    }

    update(time: number, delta: number): void {
        // console.log("update");
        super.update(time, delta);

        this.troefText.text =
            "Troef = " + (this.troef !== null ? CardSuit[this.troef] : "?");

        for (let i = 0; i < this.allCards.length; i++) {
            this.allCards[i].update();
        }
    }
}

