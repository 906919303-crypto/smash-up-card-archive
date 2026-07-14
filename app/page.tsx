"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import catalogJson from "./data/smashup-catalog.json";

type Language = "zh" | "en";
type CardType = "minion" | "character" | "action" | "titan" | "other";

type Card = {
  id: string;
  name: string;
  nameZh?: string;
  type: CardType;
  quantity: number;
  power: number | null;
  breakpoint: number | null;
  vp: number[] | null;
  text: string;
  textZh?: string;
  errata: string;
  clarifications: string[];
  clarificationsZh?: string[];
  imageUrl?: string;
  imageKind?: "card" | "faction-sheet";
  imageSource?: string;
  imageAlt?: string;
  sourceProvider?: string;
};

type PhysicalCard = {
  card: Card;
  copy: number;
};

type Faction = {
  slug: string;
  name: string;
  nameZh?: string;
  set: string;
  setZh?: string;
  complexity: string;
  mechanics: string[];
  mechanicsZh?: string[];
  sourceUrl: string;
  sourceProvider?: string;
  cards: Card[];
};

type Catalog = {
  source: {
    name: string;
    url: string;
    retrievedAt: string;
    scope: string;
    translationScope?: string;
    imageScope?: string;
    sources?: { name: string; url: string }[];
  };
  factions: Faction[];
  extraction: {
    extractedFactions: number;
    uniqueCardEntries: number;
    physicalFactionCards: number;
    titanCards: number;
    physicalCards: number;
  };
};

const catalog = catalogJson as unknown as Catalog;
const DEFAULT_FACTION = catalog.factions.find((faction) => faction.name === "Aliens") ?? catalog.factions[0];

const COPY = {
  zh: {
    archive: "SMASH UP \u00b7 \u5361\u724c\u6863\u6848",
    enter: "\u8fdb\u5165\u6863\u6848",
    kicker: "\u5927\u6740\u56db\u65b9 / Smash Up",
    titleLead: "\u628a\u6bcf\u4e2a\u79cd\u65cf\u7684",
    titleAccent: "\u5361\u724c",
    titleTail: "\u644a\u5f00\u6765\u770b\u3002",
    heroText: "\u6309\u79cd\u65cf\u9010\u5f20\u7ffb\u9605\u5361\u724c\uff0c\u67e5\u770b\u5b8c\u6574\u5361\u56fe\u3001\u6570\u91cf\u3001\u89c4\u5219\u6587\u5b57\u4e0e\u52d8\u8bef\u72b6\u6001\u3002\u6e38\u620f\u684c\u65c1\u4e5f\u80fd\u5feb\u901f\u786e\u8ba4\u3002",
    factions: "\u79cd\u65cf",
    factionCards: "\u79cd\u65cf\u724c",
    titans: "\u6cf0\u5766",
    updated: "\u6570\u636e\u66f4\u65b0\u4e8e",
    entries: "\u4e2a\u72ec\u7acb\u5361\u724c\u6761\u76ee",
    choose: "\u9009\u62e9\u79cd\u65cf",
    searchLabel: "\u641c\u7d22\u79cd\u65cf\u3001\u5361\u540d\u6216\u89c4\u5219",
    searchPlaceholder: "\u641c\u7d22\u79cd\u65cf\u3001\u5361\u540d\u6216\u89c4\u5219\u2026",
    factionFile: "\u79cd\u65cf\u6863\u6848",
    source: "\u67e5\u770b\u6765\u6e90",
    difficulty: "\u96be\u5ea6",
    entriesLabel: "\u6761\u76ee",
    cardsLabel: "\u724c\u6570",
    filters: "\u6309\u7c7b\u578b\u7b5b\u9009",
    cards: "\u5361\u724c",
    noFactions: "\u6ca1\u6709\u627e\u5230\u76f8\u5173\u79cd\u65cf\u3002",
    noCards: "\u6b64\u7b5b\u9009\u4e0b\u6ca1\u6709\u5361\u724c\u3002",
    previous: "\u4e0a\u4e00\u5f20\u5361",
    next: "\u4e0b\u4e00\u5f20\u5361",
    power: "\u529b\u91cf",
    breakpoint: "\u4e34\u754c\u70b9",
    vp: "\u80dc\u5229\u70b9",
    errata: "\u52d8\u8bef\u72b6\u6001",
    clarifications: "\u89c4\u5219\u8bf4\u660e",
    artwork: "\u5361\u56fe",
    factionSheet: "\u79cd\u65cf\u53c2\u8003\u56fe\uff08\u975e\u5355\u5361\uff09",
    sheetNote: "\u8be5\u6388\u6743\u79cd\u65cf\u7684\u6765\u6e90\u53ea\u63d0\u4f9b\u79cd\u65cf\u7ea7\u53c2\u8003\u56fe\uff0c\u5e76\u975e\u6bcf\u5f20\u724c\u7684\u72ec\u7acb\u626b\u63cf\u3002\u4e3a\u907f\u514d\u9519\u914d\uff0c\u672c\u7ad9\u4e0d\u4f1a\u628a\u5176\u4ed6\u724c\u56fe\u5f53\u4f5c\u672c\u5361\u663e\u793a\u3002",
    imageFallback: "\u6765\u6e90\u672a\u63d0\u4f9b\u8fd9\u5f20\u724c\u7684\u72ec\u7acb\u5361\u56fe\u3002",
    imageLoading: "\u6b63\u5728\u8f7d\u5165\u5361\u56fe\u2026",
    zoomImage: "\u70b9\u51fb\u67e5\u770b\u5927\u56fe",
    closeImage: "\u5173\u95ed\u5927\u56fe",
    copiesInDeck: "\u672c\u5361\u7ec4\u5185\u526f\u672c",
    translationNote: "\u4e2d\u6587\u540d\u79f0\u4e0e\u89c4\u5219\u4e3a\u81ea\u52a8\u8bd1\u6587\uff1b\u8bf7\u4ee5\u82f1\u6587\u539f\u6587\u3001\u5b9e\u4f53\u5361\u724c\u548c\u94fe\u63a5\u51fa\u5904\u4e3a\u51c6\u3002",
    scope: "\u672c\u7ad9\u6536\u5f55\u79cd\u65cf\u5361\u7ec4\uff0820 \u5f20\u724c\uff09\u4e0e\u5173\u8054\u6cf0\u5766\uff1b\u57fa\u5730\u724c\u4e0d\u5728\u672c\u76ee\u5f55\u4e2d\u3002",
    language: "\u4e2d\u6587",
    languageAlt: "English",
    viewEnglish: "\u5207\u6362\u82f1\u6587",
    viewChinese: "\u5207\u6362\u4e2d\u6587",
    sourceText: "\u8d44\u6599\u6765\u6e90",
    type: { all: "\u5168\u90e8", minion: "\u968f\u4ece", character: "\u89d2\u8272", action: "\u6218\u672f", titan: "\u6cf0\u5766", other: "\u5176\u4ed6" },
  },
  en: {
    archive: "SMASH UP \u00b7 CARD ARCHIVE",
    enter: "Browse the archive",
    kicker: "\u5927\u6740\u56db\u65b9 / Smash Up",
    titleLead: "Lay out every faction\u2019s",
    titleAccent: "cards",
    titleTail: "one by one.",
    heroText: "Browse faction decks card by card with reference artwork, quantities, rules text, and errata status.",
    factions: "factions",
    factionCards: "faction cards",
    titans: "titans",
    updated: "Data updated",
    entries: "unique card entries",
    choose: "Choose a faction",
    searchLabel: "Search factions, card names, or rules",
    searchPlaceholder: "Search factions, cards, or rules\u2026",
    factionFile: "Faction file",
    source: "View source",
    difficulty: "Complexity",
    entriesLabel: "entries",
    cardsLabel: "cards",
    filters: "Filter by type",
    cards: "Cards",
    noFactions: "No matching factions.",
    noCards: "No cards match this filter.",
    previous: "Previous card",
    next: "Next card",
    power: "Power",
    breakpoint: "Breakpoint",
    vp: "VPs",
    errata: "Errata status",
    clarifications: "Clarifications",
    artwork: "Card artwork",
    factionSheet: "Faction reference image (not this card)",
    sheetNote: "This licensed faction source only provides a faction-level reference image, not an independent scan for every card. To avoid mismatches, this archive does not present another card's image as this card.",
    imageFallback: "The source does not provide an independent image for this card.",
    imageLoading: "Loading card image…",
    zoomImage: "View full-size image",
    closeImage: "Close full-size image",
    copiesInDeck: "Copies in this deck",
    translationNote: "Chinese names and rules are automated translations. Use the English text, physical cards, and linked sources as the authority.",
    scope: "This archive covers 20-card faction decks and their Titans; base cards are outside the catalog.",
    language: "English",
    languageAlt: "\u4e2d\u6587",
    viewEnglish: "Switch to English",
    viewChinese: "\u5207\u6362\u4e2d\u6587",
    sourceText: "Sources",
    type: { all: "All", minion: "Minion", character: "Character", action: "Action", titan: "Titan", other: "Other" },
  },
} as const;

const COMPLEXITY: Record<string, { zh: string; en: string }> = {
  LOW: { zh: "\u4f4e", en: "Low" },
  "LOW-MEDIUM": { zh: "\u4f4e\u2014\u4e2d", en: "Low\u2013Medium" },
  MEDIUM: { zh: "\u4e2d", en: "Medium" },
  "MEDIUM-HIGH": { zh: "\u4e2d\u2014\u9ad8", en: "Medium\u2013High" },
  HIGH: { zh: "\u9ad8", en: "High" },
  "NOT STATED": { zh: "\u672a\u6ce8\u660e", en: "Not stated" },
};

function factionLabel(faction: Faction, language: Language) {
  return language === "zh" ? faction.nameZh || faction.name : faction.name;
}

function cardLabel(card: Card, language: Language) {
  return language === "zh" ? card.nameZh || card.name : card.name;
}

function cardText(card: Card, language: Language) {
  return language === "zh" ? card.textZh || card.text : card.text;
}

function cardNotes(card: Card, language: Language) {
  return language === "zh" ? card.clarificationsZh || card.clarifications : card.clarifications;
}

function factionMatches(faction: Faction, term: string) {
  return [
    faction.name,
    faction.nameZh,
    faction.set,
    faction.setZh,
    faction.complexity,
    ...faction.mechanics,
    ...(faction.mechanicsZh ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(term);
}

function cardMatches(card: Card, term: string) {
  return [
    card.name,
    card.nameZh,
    card.type,
    card.text,
    card.textZh,
    card.errata,
    ...card.clarifications,
    ...(card.clarificationsZh ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(term);
}

export default function Home() {
  const [language, setLanguage] = useState<Language>("zh");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [selectedFaction, setSelectedFaction] = useState(DEFAULT_FACTION.slug);
  const [selectedCard, setSelectedCard] = useState(DEFAULT_FACTION.cards[0]?.id ?? "");
  const [selectedCopy, setSelectedCopy] = useState(1);
  const [imageState, setImageState] = useState<"loading" | "ready" | "error">("loading");
  const [isImageZoomOpen, setImageZoomOpen] = useState(false);
  const shouldJumpToCards = useRef(false);
  const cardStageRef = useRef<HTMLElement>(null);

  const ui = COPY[language];
  const term = query.trim().toLowerCase();

  const visibleFactions = useMemo(
    () =>
      catalog.factions.filter((faction) => {
        if (!term) return true;
        return factionMatches(faction, term) || faction.cards.some((card) => cardMatches(card, term));
      }),
    [term],
  );

  const activeFaction =
    catalog.factions.find((faction) => faction.slug === selectedFaction) ??
    visibleFactions[0] ??
    catalog.factions[0];

  const visibleCards = useMemo(
    () =>
      activeFaction.cards.filter(
        (card) => (type === "all" || card.type === type) && (!term || cardMatches(card, term)),
      ),
    [activeFaction, term, type],
  );

  const physicalCards = useMemo<PhysicalCard[]>(
    () => visibleCards.flatMap((card) => Array.from({ length: card.quantity }, (_, index) => ({ card, copy: index + 1 }))),
    [visibleCards],
  );
  const selectedPhysicalCard = physicalCards.find(
    (entry) => entry.card.id === selectedCard && entry.copy === selectedCopy,
  );
  const currentPhysicalCard = selectedPhysicalCard ?? physicalCards[0];
  const currentCard = currentPhysicalCard?.card;
  const currentCopy = currentPhysicalCard?.copy ?? 1;
  const cardIndex = currentPhysicalCard
    ? physicalCards.findIndex((entry) => entry.card.id === currentPhysicalCard.card.id && entry.copy === currentPhysicalCard.copy)
    : -1;
  const shownDate = new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(catalog.source.retrievedAt));

  useEffect(() => {
    if (visibleFactions.length > 0 && !visibleFactions.some((faction) => faction.slug === selectedFaction)) {
      setSelectedFaction(visibleFactions[0].slug);
      setSelectedCard(visibleFactions[0].cards[0]?.id ?? "");
      setSelectedCopy(1);
    }
  }, [selectedFaction, visibleFactions]);

  useEffect(() => {
    if (visibleCards.length > 0 && !visibleCards.some((card) => card.id === selectedCard)) {
      setSelectedCard(visibleCards[0].id);
      setSelectedCopy(1);
    }
  }, [selectedCard, visibleCards]);

  useEffect(() => {
    if (!selectedPhysicalCard && physicalCards[0]) {
      setSelectedCard(physicalCards[0].card.id);
      setSelectedCopy(physicalCards[0].copy);
    }
  }, [physicalCards, selectedPhysicalCard]);

  useEffect(() => {
    setImageState(currentCard?.imageUrl ? "loading" : "error");
    setImageZoomOpen(false);
  }, [currentCard?.id, currentCard?.imageUrl]);

  useEffect(() => {
    if (!isImageZoomOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setImageZoomOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isImageZoomOpen]);

  useEffect(() => {
    if (cardIndex < 0) return;
    const nearby = [physicalCards[cardIndex - 1], physicalCards[cardIndex], physicalCards[cardIndex + 1]];
    const loaded = new Set<string>();
    nearby.forEach((entry) => {
      const imageUrl = entry?.card.imageUrl;
      if (!imageUrl || entry?.card.imageKind === "faction-sheet" || loaded.has(imageUrl)) return;
      loaded.add(imageUrl);
      const image = new Image();
      image.decoding = "async";
      image.referrerPolicy = "no-referrer";
      image.src = imageUrl;
    });
  }, [cardIndex, physicalCards]);

  useEffect(() => {
    if (!shouldJumpToCards.current) return;
    shouldJumpToCards.current = false;
    requestAnimationFrame(() => cardStageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [selectedFaction]);

  function chooseFaction(faction: Faction) {
    shouldJumpToCards.current = true;
    setQuery("");
    setSelectedFaction(faction.slug);
    setSelectedCard(faction.cards[0]?.id ?? "");
    setSelectedCopy(1);
  }

  function chooseCard(card: Card) {
    setSelectedCard(card.id);
    setSelectedCopy(1);
    if (window.matchMedia("(max-width: 860px)").matches) {
      requestAnimationFrame(() => cardStageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  function choosePhysicalCard(entry: PhysicalCard) {
    setSelectedCard(entry.card.id);
    setSelectedCopy(entry.copy);
  }

  function goToCard(direction: number) {
    if (!physicalCards.length || cardIndex < 0) return;
    const nextIndex = (cardIndex + direction + physicalCards.length) % physicalCards.length;
    choosePhysicalCard(physicalCards[nextIndex]);
  }

  return (
    <main>
      <header className="hero">
        <div className="heroNoise" aria-hidden="true" />
        <div className="heroTopline">
          <span className="eyebrow">{ui.archive}</span>
          <div className="heroActions">
            <button
              className="languageToggle"
              onClick={() => setLanguage((current) => current === "zh" ? "en" : "zh")}
              aria-label={language === "zh" ? ui.viewEnglish : ui.viewChinese}
            >
              <span>{ui.language}</span>
              <b>{ui.languageAlt}</b>
            </button>
            <a href="#catalog">{ui.enter} {"\u2198"}</a>
          </div>
        </div>
        <div className="heroGrid">
          <section className="heroCopy">
            <p className="kicker">{ui.kicker}</p>
            <h1>{ui.titleLead}<br /><em>{ui.titleAccent}</em> {ui.titleTail}</h1>
            <p className="heroText">{ui.heroText}</p>
          </section>
          <section className="statStack" aria-label="Catalog statistics">
            <div><strong>{catalog.extraction.extractedFactions}</strong><span>{ui.factions}</span></div>
            <div><strong>{catalog.extraction.physicalFactionCards.toLocaleString()}</strong><span>{ui.factionCards}</span></div>
            <div><strong>{catalog.extraction.titanCards}</strong><span>{ui.titans}</span></div>
          </section>
        </div>
        <p className="sourceLine">{ui.updated} {shownDate} {"\u00b7"} {catalog.extraction.uniqueCardEntries.toLocaleString()} {ui.entries}</p>
      </header>

      <section className="catalogShell" id="catalog" aria-label="Smash Up card catalog">
        <aside className="factionPanel">
          <div className="panelHeading">
            <div>
              <p className="eyebrow">01 / CHOOSE A FACTION</p>
              <h2>{ui.choose}</h2>
            </div>
            <span>{visibleFactions.length}</span>
          </div>

          <label className="searchBox">
            <span className="srOnly">{ui.searchLabel}</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={ui.searchPlaceholder}
            />
            <b>{"\u2315"}</b>
          </label>

          <div className="factionList" role="list">
            {visibleFactions.map((faction) => {
              const count = faction.cards.reduce((sum, card) => sum + card.quantity, 0);
              return (
                <button
                  className={faction.slug === activeFaction.slug ? "factionButton active" : "factionButton"}
                  key={faction.slug}
                  onClick={() => chooseFaction(faction)}
                  aria-pressed={faction.slug === activeFaction.slug}
                >
                  <span>{factionLabel(faction, language)}</span>
                  <small>{count} {language === "zh" ? "\u5f20" : ""}</small>
                </button>
              );
            })}
            {!visibleFactions.length && <p className="emptyList">{ui.noFactions}</p>}
          </div>
        </aside>

        <section className="contentPanel">
          <div className="factionSummary">
            <div>
              <p className="eyebrow">02 / FACTION FILE</p>
              <h2>{factionLabel(activeFaction, language)}</h2>
              <p className="setName">{language === "zh" ? activeFaction.setZh || activeFaction.set : activeFaction.set}</p>
            </div>
            <a className="sourceLink" href={activeFaction.sourceUrl} target="_blank" rel="noreferrer">{ui.source} {"\u2197"}</a>
          </div>

          <div className="metaRow">
            <span><i>{ui.difficulty}</i>{COMPLEXITY[activeFaction.complexity]?.[language] ?? activeFaction.complexity}</span>
            <span><i>{ui.entriesLabel}</i>{activeFaction.cards.length}</span>
            <span><i>{ui.cardsLabel}</i>{activeFaction.cards.reduce((sum, card) => sum + card.quantity, 0)}</span>
          </div>

          {activeFaction.mechanics.length > 0 && (
            <div className="mechanics" aria-label="Faction mechanics">
              {(language === "zh" ? activeFaction.mechanicsZh || activeFaction.mechanics : activeFaction.mechanics).map((mechanic, index) => (
                <span key={activeFaction.mechanics[index] + index}>{mechanic}</span>
              ))}
            </div>
          )}

          <div className="filterRow" aria-label={ui.filters}>
            {Object.entries(ui.type).map(([value, label]) => (
              <button
                className={type === value ? "filterButton selected" : "filterButton"}
                key={value}
                onClick={() => setType(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="browserLayout">
            <nav className="cardList" aria-label={ui.cards}>
              <div className="cardListHeader">
                <span>03 / {ui.cards.toUpperCase()}</span>
                <b title={language === "zh" ? "独立条目 / 实体卡张数" : "Unique entries / physical cards"}>{language === "zh" ? `${visibleCards.length} \u79cd \u00b7 ${physicalCards.length} \u5f20` : `${visibleCards.length} types \u00b7 ${physicalCards.length} cards`}</b>
              </div>
              {visibleCards.map((card) => (
                <button
                  className={card.id === currentCard?.id ? "cardRow active" : "cardRow"}
                  key={card.id}
                  onClick={() => chooseCard(card)}
                >
                  <span className="typeMark">{ui.type[card.type] ?? ui.type.other}</span>
                  <span className="cardRowName">{cardLabel(card, language)}</span>
                  <strong>{"\u00d7"}{card.quantity}</strong>
                </button>
              ))}
              {!visibleCards.length && <p className="emptyList">{ui.noCards}</p>}
            </nav>

            <section className="cardStage" ref={cardStageRef} aria-live="polite">
              {currentCard ? (
                <>
                  <div className="stageTop">
                    <span>{language === "zh" ? `第 ${cardIndex + 1} / ${physicalCards.length} 张` : `${cardIndex + 1} / ${physicalCards.length} cards`}</span>
                    <div className="stepButtons">
                      <button onClick={() => goToCard(-1)} aria-label={ui.previous}>{"\u2190"}</button>
                      <button onClick={() => goToCard(1)} aria-label={ui.next}>{"\u2192"}</button>
                    </div>
                  </div>

                  <div className="cardViewer">
                    <figure className={"artwork " + (currentCard.imageKind === "faction-sheet" ? "sheet " : "") + (imageState === "loading" ? "isLoading" : "")}>
                      {currentCard.imageUrl && imageState !== "error" ? (
                        <>
                          {imageState === "loading" && <div className="imageLoading" aria-live="polite">{ui.imageLoading}</div>}
                          <button
                            className="imageZoomButton"
                            type="button"
                            onClick={() => setImageZoomOpen(true)}
                            aria-label={ui.zoomImage}
                            disabled={imageState !== "ready"}
                          >
                            <img
                              key={currentCard.imageUrl}
                              src={currentCard.imageUrl}
                              alt={currentCard.imageAlt || cardLabel(currentCard, language)}
                              loading="eager"
                              decoding="async"
                              referrerPolicy="no-referrer"
                              onLoad={() => setImageState("ready")}
                              onError={() => setImageState("error")}
                            />
                            <span className="imageZoomHint">{ui.zoomImage}</span>
                          </button>
                        </>
                      ) : (
                        <div className="imageFallback">
                          <p>{ui.imageFallback}</p>
                          <a href={activeFaction.sourceUrl} target="_blank" rel="noreferrer">{ui.source} {"\u2197"}</a>
                        </div>
                      )}
                      <figcaption>
                        <span>{currentCard.imageKind === "faction-sheet" ? ui.factionSheet : ui.artwork}</span>
                        <a href={activeFaction.sourceUrl} target="_blank" rel="noreferrer">{ui.source} {"\u2197"}</a>
                      </figcaption>
                    </figure>

                    <article className={"cardFace " + currentCard.type}>
                      <div className="cardFaceTop">
                        <span>{ui.type[currentCard.type] ?? ui.type.other}</span>
                        <span>{language === "zh" ? `第 ${currentCopy} / ${currentCard.quantity} 张副本` : `Copy ${currentCopy} of ${currentCard.quantity}`}</span>
                      </div>
                      <div className="cardNameBlock">
                        <h3>{cardLabel(currentCard, language)}</h3>
                        <p>{factionLabel(activeFaction, language)}</p>
                      </div>
                      <div className="cardStats">
                        {currentCard.power !== null && <span><b>{currentCard.power}</b>{ui.power}</span>}
                        {currentCard.breakpoint !== null && <span><b>{currentCard.breakpoint}</b>{ui.breakpoint}</span>}
                        {currentCard.vp && <span><b>{currentCard.vp.join(" / ")}</b>{ui.vp}</span>}
                      </div>
                      <p className="cardRules">{cardText(currentCard, language)}</p>
                      <div className="cardFaceBottom">
                        <span>{currentCard.sourceProvider ?? activeFaction.sourceProvider ?? ui.sourceText}</span>
                        <span>SMASH UP</span>
                      </div>
                    </article>
                  </div>

                  <div className="copyRail">
                    <span>{ui.copiesInDeck}</span>
                    <div className="copyButtons" role="group" aria-label={ui.copiesInDeck}>
                      {Array.from({ length: currentCard.quantity }, (_, index) => index + 1).map((copy) => (
                        <button
                          className={copy === currentCopy ? "active" : ""}
                          key={copy}
                          onClick={() => choosePhysicalCard({ card: currentCard, copy })}
                          aria-pressed={copy === currentCopy}
                        >
                          {copy}
                        </button>
                      ))}
                    </div>
                  </div>

                  {currentCard.imageKind === "faction-sheet" && <p className="sheetNote">{ui.sheetNote}</p>}

                  <div className="cardNotes">
                    <div className="errataNote">
                      <span>{ui.errata}</span>
                      <b>{currentCard.errata}</b>
                    </div>
                    {cardNotes(currentCard, language).length > 0 && (
                      <details>
                        <summary>{ui.clarifications} ({cardNotes(currentCard, language).length})</summary>
                        <ul>
                          {cardNotes(currentCard, language).map((note, index) => <li key={index}>{note}</li>)}
                        </ul>
                      </details>
                    )}
                  </div>
                </>
              ) : (
                <div className="emptyStage"><p>{ui.noCards}</p></div>
              )}
            </section>
          </div>
        </section>
      </section>

      <footer>
        <div>
          <p className="eyebrow">{ui.sourceText.toUpperCase()} & SCOPE</p>
          <p>{ui.scope} {ui.translationNote}</p>
        </div>
        <div className="footerLinks">
          {(catalog.source.sources ?? [{ name: catalog.source.name, url: catalog.source.url }]).map((source) => (
            <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.name} {"\u2197"}</a>
          ))}
        </div>
      </footer>

      {isImageZoomOpen && currentCard?.imageUrl && imageState === "ready" && (
        <div
          className="imageLightbox"
          role="dialog"
          aria-modal="true"
          aria-label={ui.zoomImage}
          onClick={(event) => {
            if (event.target === event.currentTarget) setImageZoomOpen(false);
          }}
        >
          <div className="imageLightboxFrame">
            <button className="lightboxClose" type="button" onClick={() => setImageZoomOpen(false)} aria-label={ui.closeImage}>{"\u00d7"}</button>
            <img src={currentCard.imageUrl} alt={currentCard.imageAlt || cardLabel(currentCard, language)} referrerPolicy="no-referrer" />
            <p>{cardLabel(currentCard, language)}</p>
          </div>
        </div>
      )}
    </main>
  );
}
