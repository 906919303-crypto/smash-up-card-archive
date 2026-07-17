"use client";

import { useEffect, useMemo, useState } from "react";

type Language = "zh" | "en";
type Side = "self" | "opponent";
type Zone = "deck" | "hand" | "discard";
type SideFactions = [string, string];

export type TrackerCard = {
  id: string;
  name: string;
  nameZh?: string;
  type: "minion" | "character" | "action" | "titan" | "other";
  quantity: number;
  power: number | null;
  breakpoint: number | null;
  vp: number[] | null;
  text: string;
  textZh?: string;
  imageUrl?: string;
  imageAlt?: string;
  imageKind?: "card" | "faction-sheet";
};

export type TrackerFaction = {
  slug: string;
  name: string;
  nameZh?: string;
  set: string;
  setZh?: string;
  cards: TrackerCard[];
};

type Setup = Record<Side, SideFactions>;
type Match = {
  factions: Setup;
  zones: Record<string, Zone>;
};

type TrackedCard = {
  instanceId: string;
  side: Side;
  faction: TrackerFaction;
  card: TrackerCard;
  copy: number;
};

const STORAGE_KEY = "smash-up-card-tracker-v1";

const COPY = {
  zh: {
    eyebrow: "03 / 对局记牌器",
    title: "双方卡组记牌器",
    description: "开局选择双方各两个种族。点击卡牌即可标记为弃牌；也可以单独放入手牌区。",
    setup: "建立本局对战",
    setupHint: "每方选择两个不同种族，即可生成各自 40 张的记牌库。",
    self: "我方",
    opponent: "对方",
    factionOne: "种族一",
    factionTwo: "种族二",
    chooseFaction: "选择种族",
    start: "开始记牌",
    reset: "重置状态",
    change: "重新选组",
    deck: "牌库",
    hand: "手牌",
    discard: "弃牌堆",
    allCards: "本局全部卡牌",
    clickToDiscard: "点击卡牌：标记弃牌",
    restore: "回到牌库",
    moveToHand: "移至手牌",
    inHand: "在手牌中",
    discarded: "已弃牌",
    cards: "张",
    selectBoth: "请先为双方各选两个不同种族。",
    restored: "已恢复上一次未结束的对局记录。",
    clearSaved: "清除本机记录",
    noHand: "尚未标记手牌",
    noDiscard: "暂无弃牌",
    copy: "副本",
    details: "查看详情",
    close: "关闭",
    rules: "规则",
    artwork: "卡图",
    noArtwork: "暂无单卡卡图",
    power: "力量",
    breakpoint: "临界点",
    vp: "胜利点",
    type: { minion: "随从", character: "角色", action: "战术", titan: "泰坦", other: "其他" },
  },
  en: {
    eyebrow: "03 / MATCH TRACKER",
    title: "Two-player card tracker",
    description: "Choose two factions per side. Click a card to mark it discarded, or move it to the hand zone.",
    setup: "Set up a match",
    setupHint: "Choose two different factions for each side to build two 40-card trackers.",
    self: "Your side",
    opponent: "Opponent",
    factionOne: "Faction one",
    factionTwo: "Faction two",
    chooseFaction: "Choose a faction",
    start: "Start tracking",
    reset: "Reset zones",
    change: "Change factions",
    deck: "Deck",
    hand: "Hand",
    discard: "Discard pile",
    allCards: "All cards in this match",
    clickToDiscard: "Click a card to mark it discarded",
    restore: "Return to deck",
    moveToHand: "Move to hand",
    inHand: "In hand",
    discarded: "Discarded",
    cards: "cards",
    selectBoth: "Choose two different factions for each side first.",
    restored: "Your unfinished match was restored on this device.",
    clearSaved: "Clear device record",
    noHand: "No cards marked in hand",
    noDiscard: "No discarded cards",
    copy: "Copy",
    details: "View details",
    close: "Close",
    rules: "Rules",
    artwork: "Artwork",
    noArtwork: "No individual card artwork available",
    power: "Power",
    breakpoint: "Breakpoint",
    vp: "Victory points",
    type: { minion: "Minion", character: "Character", action: "Action", titan: "Titan", other: "Other" },
  },
} as const;

function factionLabel(faction: TrackerFaction, language: Language) {
  return language === "zh" ? faction.nameZh || faction.name : faction.name;
}

function cardLabel(card: TrackerCard, language: Language) {
  return language === "zh" ? card.nameZh || card.name : card.name;
}

function cardText(card: TrackerCard, language: Language) {
  return language === "zh" ? card.textZh || card.text : card.text;
}

function makeInstanceId(side: Side, faction: TrackerFaction, card: TrackerCard, copy: number) {
  return [side, faction.slug, card.id, copy].join("::");
}

function createTrackedCards(factions: TrackerFaction[], match: Match | null): TrackedCard[] {
  if (!match) return [];
  const bySlug = new Map(factions.map((faction) => [faction.slug, faction]));
  return (["self", "opponent"] as Side[]).flatMap((side) =>
    match.factions[side].flatMap((slug) => {
      const faction = bySlug.get(slug);
      if (!faction) return [];
      return faction.cards.flatMap((card) =>
        Array.from({ length: card.quantity }, (_, index) => ({
          instanceId: makeInstanceId(side, faction, card, index + 1),
          side,
          faction,
          card,
          copy: index + 1,
        })),
      );
    }),
  );
}

function isSetupComplete(setup: Setup) {
  return (["self", "opponent"] as Side[]).every(
    (side) => Boolean(setup[side][0]) && Boolean(setup[side][1]) && setup[side][0] !== setup[side][1],
  );
}

function isSavedMatch(value: unknown): value is Match {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Match;
  return Boolean(
    candidate.factions &&
      Array.isArray(candidate.factions.self) &&
      Array.isArray(candidate.factions.opponent) &&
      candidate.factions.self.length === 2 &&
      candidate.factions.opponent.length === 2 &&
      candidate.zones &&
      typeof candidate.zones === "object",
  );
}

export function CardTracker({ factions, language }: { factions: TrackerFaction[]; language: Language }) {
  const ui = COPY[language];
  const [setup, setSetup] = useState<Setup>({ self: ["", ""], opponent: ["", ""] });
  const [match, setMatch] = useState<Match | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [restored, setRestored] = useState(false);
  const [detailCard, setDetailCard] = useState<TrackedCard | null>(null);

  const factionsBySet = useMemo(() => {
    const groups = new Map<string, TrackerFaction[]>();
    for (const faction of factions) {
      const group = groups.get(faction.set) ?? [];
      group.push(faction);
      groups.set(faction.set, group);
    }
    return [...groups.entries()].map(([set, items]) => ({
      set,
      label: language === "zh" ? items[0]?.setZh || set : set,
      factions: items.sort((left, right) => factionLabel(left, language).localeCompare(factionLabel(right, language), language === "zh" ? "zh-CN" : "en")),
    }));
  }, [factions, language]);

  const trackedCards = useMemo(() => createTrackedCards(factions, match), [factions, match]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (isSavedMatch(parsed) && isSetupComplete(parsed.factions)) {
          setMatch(parsed);
          setSetup(parsed.factions);
          setRestored(true);
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (match) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(match));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [hydrated, match]);

  useEffect(() => {
    if (!detailCard) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetailCard(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [detailCard]);

  function updateSelection(side: Side, position: 0 | 1, value: string) {
    setSetup((current) => {
      const next = [...current[side]] as SideFactions;
      next[position] = value;
      return { ...current, [side]: next };
    });
  }

  function startMatch() {
    if (!isSetupComplete(setup)) return;
    setMatch({ factions: { self: [...setup.self] as SideFactions, opponent: [...setup.opponent] as SideFactions }, zones: {} });
    setRestored(false);
  }

  function setZone(instanceId: string, zone: Zone) {
    setMatch((current) => current ? { ...current, zones: { ...current.zones, [instanceId]: zone } } : current);
  }

  function toggleDiscard(instanceId: string) {
    const currentZone = match?.zones[instanceId] ?? "deck";
    setZone(instanceId, currentZone === "discard" ? "deck" : "discard");
  }

  function resetZones() {
    setMatch((current) => current ? { ...current, zones: {} } : current);
  }

  function clearMatch() {
    setMatch(null);
    setRestored(false);
    setDetailCard(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  function factionPicker(side: Side, position: 0 | 1) {
    const otherPosition = position === 0 ? 1 : 0;
    const value = setup[side][position];
    return (
      <label className="trackerSelect">
        <span>{position === 0 ? ui.factionOne : ui.factionTwo}</span>
        <select value={value} onChange={(event) => updateSelection(side, position, event.target.value)}>
          <option value="">{ui.chooseFaction}</option>
          {factionsBySet.map((group) => (
            <optgroup key={group.set} label={group.label}>
              {group.factions.map((faction) => (
                <option
                  key={faction.slug}
                  value={faction.slug}
                  disabled={setup[side][otherPosition] === faction.slug}
                >
                  {factionLabel(faction, language)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
    );
  }

  if (!match) {
    return (
      <section className="trackerShell" id="tracker" aria-label={ui.title}>
        <div className="trackerIntro">
          <div>
            <p className="eyebrow">{ui.eyebrow}</p>
            <h2>{ui.title}</h2>
            <p>{ui.description}</p>
          </div>
          <div className="trackerLegend">
            <span><i className="legendDeck" />{ui.deck}</span>
            <span><i className="legendHand" />{ui.hand}</span>
            <span><i className="legendDiscard" />{ui.discard}</span>
          </div>
        </div>

        <div className="trackerSetup">
          {(["self", "opponent"] as Side[]).map((side) => (
            <section className={"trackerSetupSide " + side} key={side}>
              <p className="eyebrow">01 / {side === "self" ? ui.self : ui.opponent}</p>
              <h3>{side === "self" ? ui.self : ui.opponent}</h3>
              <div className="trackerSelectGrid">
                {factionPicker(side, 0)}
                {factionPicker(side, 1)}
              </div>
            </section>
          ))}
        </div>

        <div className="trackerStart">
          {!isSetupComplete(setup) && <p>{ui.selectBoth}</p>}
          {restored && <p>{ui.restored}</p>}
          <button className="trackerPrimary" type="button" disabled={!isSetupComplete(setup)} onClick={startMatch}>
            {ui.start} →
          </button>
          {restored && <button className="trackerSecondary" type="button" onClick={clearMatch}>{ui.clearSaved}</button>}
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="trackerShell" id="tracker" aria-label={ui.title}>
      <div className="trackerIntro">
        <div>
          <p className="eyebrow">{ui.eyebrow}</p>
          <h2>{ui.title}</h2>
          <p>{ui.clickToDiscard}</p>
        </div>
        <div className="trackerToolbar">
          <button className="trackerSecondary" type="button" onClick={resetZones}>{ui.reset}</button>
          <button className="trackerSecondary" type="button" onClick={clearMatch}>{ui.change}</button>
        </div>
      </div>

      <div className="trackerSides">
        {(["self", "opponent"] as Side[]).map((side) => {
          const sideCards = trackedCards.filter((entry) => entry.side === side);
          const handCards = sideCards.filter((entry) => (match.zones[entry.instanceId] ?? "deck") === "hand");
          const discardCards = sideCards.filter((entry) => (match.zones[entry.instanceId] ?? "deck") === "discard");
          const deckCount = sideCards.length - handCards.length - discardCards.length;
          const sideFactions = match.factions[side]
            .map((slug) => factions.find((faction) => faction.slug === slug))
            .filter((faction): faction is TrackerFaction => Boolean(faction));

          return (
            <section className={"trackerSide " + side} key={side}>
              <header className="trackerSideHeader">
                <div>
                  <p className="eyebrow">{side === "self" ? "01 / YOUR DECK" : "02 / OPPONENT DECK"}</p>
                  <h3>{side === "self" ? ui.self : ui.opponent}</h3>
                </div>
                <div className="trackerFactionChips">
                  {sideFactions.map((faction) => <span key={faction.slug}>{factionLabel(faction, language)}</span>)}
                </div>
              </header>

              <div className="trackerCounts" aria-label={side === "self" ? ui.self : ui.opponent}>
                <div><span>{ui.deck}</span><b>{deckCount}</b></div>
                <div><span>{ui.hand}</span><b>{handCards.length}</b></div>
                <div><span>{ui.discard}</span><b>{discardCards.length}</b></div>
              </div>

              <div className="trackerZones">
                <section className="trackerZone handZone">
                  <div className="trackerZoneHeading"><span>{ui.hand}</span><b>{handCards.length}</b></div>
                  {handCards.length ? (
                    <div className="trackerMiniCards">
                      {handCards.map((entry) => (
                        <button key={entry.instanceId} type="button" onClick={() => setZone(entry.instanceId, "deck")} title={ui.restore}>
                          {cardLabel(entry.card, language)} <small>#{entry.copy}</small>
                        </button>
                      ))}
                    </div>
                  ) : <p>{ui.noHand}</p>}
                </section>
                <section className="trackerZone discardZone">
                  <div className="trackerZoneHeading"><span>{ui.discard}</span><b>{discardCards.length}</b></div>
                  {discardCards.length ? (
                    <div className="trackerMiniCards">
                      {discardCards.map((entry) => (
                        <button key={entry.instanceId} type="button" onClick={() => setZone(entry.instanceId, "deck")} title={ui.restore}>
                          {cardLabel(entry.card, language)} <small>#{entry.copy}</small>
                        </button>
                      ))}
                    </div>
                  ) : <p>{ui.noDiscard}</p>}
                </section>
              </div>

              <div className="trackerLibraryHeading">
                <span>{ui.allCards}</span>
                <small>{sideCards.length} {ui.cards}</small>
              </div>
              <div className="trackerCardGrid">
                {sideCards.map((entry) => {
                  const zone = match.zones[entry.instanceId] ?? "deck";
                  return (
                    <article className={"trackerCard " + zone} key={entry.instanceId}>
                      <button
                        className="trackerCardPrimary"
                        type="button"
                        onClick={() => toggleDiscard(entry.instanceId)}
                        aria-pressed={zone === "discard"}
                        aria-label={cardLabel(entry.card, language) + (zone === "discard" ? " — " + ui.restore : " — " + ui.discard)}
                      >
                        <span className="trackerCardTop">
                          <i>{ui.type[entry.card.type] ?? ui.type.other}</i>
                          <em>#{entry.copy}</em>
                        </span>
                        <strong>{cardLabel(entry.card, language)}</strong>
                        <small>{factionLabel(entry.faction, language)}</small>
                        <span className="trackerCardMeta">
                          {entry.card.power !== null ? (language === "zh" ? "力量 " : "Power ") + entry.card.power : ui.copy}
                        </span>
                        {zone !== "deck" && <b>{zone === "hand" ? ui.inHand : ui.discarded}</b>}
                      </button>
                      <div className="trackerCardActions">
                        <button type="button" onClick={() => setDetailCard(entry)}>{ui.details}</button>
                        {zone !== "hand" && <button type="button" onClick={() => setZone(entry.instanceId, "hand")}>{ui.moveToHand}</button>}
                        {zone !== "deck" && <button type="button" onClick={() => setZone(entry.instanceId, "deck")}>{ui.restore}</button>}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      </section>

      {detailCard && (
        <div
          className="trackerDetailOverlay"
          role="dialog"
          aria-modal="true"
          aria-label={cardLabel(detailCard.card, language)}
          onClick={(event) => {
            if (event.target === event.currentTarget) setDetailCard(null);
          }}
        >
          <article className="trackerDetailModal">
            <button className="trackerDetailClose" type="button" onClick={() => setDetailCard(null)} aria-label={ui.close}>×</button>
            <div className="trackerDetailContent">
              <figure className="trackerDetailArtwork">
                {detailCard.card.imageUrl && detailCard.card.imageKind !== "faction-sheet" ? (
                  <img
                    src={detailCard.card.imageUrl}
                    alt={detailCard.card.imageAlt || cardLabel(detailCard.card, language)}
                    loading="eager"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                ) : <figcaption>{ui.noArtwork}</figcaption>}
              </figure>
              <div className="trackerDetailRules">
                <span className="trackerCardTop">
                  <i>{ui.type[detailCard.card.type] ?? ui.type.other}</i>
                  <em>#{detailCard.copy}</em>
                </span>
                <p className="trackerDetailFaction">{factionLabel(detailCard.faction, language)}</p>
                <h3>{cardLabel(detailCard.card, language)}</h3>
                <div className="trackerDetailStats">
                  {detailCard.card.power !== null && <span><b>{detailCard.card.power}</b>{ui.power}</span>}
                  {detailCard.card.breakpoint !== null && <span><b>{detailCard.card.breakpoint}</b>{ui.breakpoint}</span>}
                  {detailCard.card.vp && <span><b>{detailCard.card.vp.join(" / ")}</b>{ui.vp}</span>}
                </div>
                <p className="trackerDetailRuleText">{cardText(detailCard.card, language)}</p>
              </div>
            </div>
          </article>
        </div>
      )}
    </>
  );
}
