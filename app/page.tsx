"use client";

import { useEffect, useMemo, useState } from "react";
import catalogJson from "./data/smashup-catalog.json";

type CardType = "minion" | "character" | "action" | "titan" | "other";
type Card = {
  id: string;
  name: string;
  type: CardType;
  quantity: number;
  power: number | null;
  breakpoint: number | null;
  vp: number[] | null;
  text: string;
  errata: string;
  clarifications: string[];
  sourceProvider?: string;
};
type Faction = {
  slug: string;
  name: string;
  set: string;
  complexity: string;
  mechanics: string[];
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
const TYPE_LABEL: Record<string, string> = {
  all: "全部",
  minion: "随从",
  character: "角色",
  action: "行动",
  titan: "泰坦",
  other: "其他",
};
const COMPLEXITY_LABEL: Record<string, string> = {
  LOW: "低",
  "LOW-MEDIUM": "低—中",
  MEDIUM: "中",
  "MEDIUM-HIGH": "中—高",
  HIGH: "高",
  "NOT STATED": "未注明",
};
const DEFAULT_FACTION = catalog.factions.find((faction) => faction.name === "Aliens") ?? catalog.factions[0];

function matches(card: Card, term: string) {
  const haystack = [card.name, card.type, card.text, card.errata, ...card.clarifications]
    .join(" ")
    .toLowerCase();
  return haystack.includes(term);
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [selectedFaction, setSelectedFaction] = useState(DEFAULT_FACTION.slug);
  const [selectedCard, setSelectedCard] = useState(DEFAULT_FACTION.cards[0]?.id ?? "");

  const term = query.trim().toLowerCase();
  const visibleFactions = useMemo(
    () =>
      catalog.factions.filter((faction) => {
        if (!term) return true;
        return [faction.name, faction.set, faction.complexity, ...faction.mechanics]
          .join(" ")
          .toLowerCase()
          .includes(term) || faction.cards.some((card) => matches(card, term));
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
        (card) => (type === "all" || card.type === type) && (!term || matches(card, term)),
      ),
    [activeFaction, term, type],
  );

  const currentCard = visibleCards.find((card) => card.id === selectedCard) ?? visibleCards[0];
  const cardIndex = currentCard ? visibleCards.findIndex((card) => card.id === currentCard.id) : -1;
  const shownDate = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(catalog.source.retrievedAt));

  useEffect(() => {
    if (
      visibleFactions.length > 0 &&
      !visibleFactions.some((faction) => faction.slug === selectedFaction)
    ) {
      setSelectedFaction(visibleFactions[0].slug);
    }
  }, [selectedFaction, visibleFactions]);

  useEffect(() => {
    if (visibleCards.length > 0 && !visibleCards.some((card) => card.id === selectedCard)) {
      setSelectedCard(visibleCards[0].id);
    }
  }, [selectedCard, visibleCards]);

  const goToCard = (direction: number) => {
    if (!visibleCards.length || cardIndex < 0) return;
    const nextIndex = (cardIndex + direction + visibleCards.length) % visibleCards.length;
    setSelectedCard(visibleCards[nextIndex].id);
  };

  return (
    <main>
      <header className="hero">
        <div className="heroNoise" aria-hidden="true" />
        <div className="heroTopline">
          <span className="eyebrow">SMASH UP · CARD ARCHIVE</span>
          <a href="#catalog">进入档案库 ↓</a>
        </div>
        <div className="heroGrid">
          <section className="heroCopy">
            <p className="kicker">大杀四方 / Smash Up</p>
            <h1>把每个种族的<br /><em>卡牌</em>摊开来看。</h1>
            <p className="heroText">
              从卡组构成到单张规则原文，一次查看一个种族、一张卡。
              适合组队前查阅，也适合在游戏桌旁快速确认文字与勘误。
            </p>
          </section>
          <section className="statStack" aria-label="目录统计">
            <div><strong>{catalog.extraction.extractedFactions}</strong><span>种族</span></div>
            <div><strong>{catalog.extraction.physicalFactionCards.toLocaleString()}</strong><span>种族牌</span></div>
            <div><strong>{catalog.extraction.titanCards}</strong><span>泰坦</span></div>
          </section>
        </div>
        <p className="sourceLine">
          数据更新于 {shownDate} · {catalog.extraction.uniqueCardEntries.toLocaleString()} 个独立卡牌条目
        </p>
      </header>

      <section className="catalogShell" id="catalog" aria-label="Smash Up 卡牌目录">
        <aside className="factionPanel">
          <div className="panelHeading">
            <div>
              <p className="eyebrow">01 / CHOOSE A FACTION</p>
              <h2>选择种族</h2>
            </div>
            <span>{visibleFactions.length}</span>
          </div>

          <label className="searchBox">
            <span className="srOnly">搜索种族或卡牌</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索种族、卡名或规则…"
            />
            <b>⌕</b>
          </label>

          <div className="factionList" role="list">
            {visibleFactions.map((faction) => {
              const count = faction.cards.reduce((sum, card) => sum + card.quantity, 0);
              return (
                <button
                  className={faction.slug === activeFaction.slug ? "factionButton active" : "factionButton"}
                  key={faction.slug}
                  onClick={() => {
                    setSelectedFaction(faction.slug);
                    setSelectedCard(faction.cards[0]?.id ?? "");
                  }}
                  aria-pressed={faction.slug === activeFaction.slug}
                >
                  <span>{faction.name}</span>
                  <small>{count} 张</small>
                </button>
              );
            })}
            {!visibleFactions.length && (
              <p className="emptyList">没有找到相关种族。</p>
            )}
          </div>
        </aside>

        <section className="contentPanel">
          <div className="factionSummary">
            <div>
              <p className="eyebrow">02 / FACTION FILE</p>
              <h2>{activeFaction.name}</h2>
              <p className="setName">{activeFaction.set}</p>
            </div>
            <a className="sourceLink" href={activeFaction.sourceUrl} target="_blank" rel="noreferrer">
              查看来源 ↗
            </a>
          </div>

          <div className="metaRow">
            <span><i>难度</i>{COMPLEXITY_LABEL[activeFaction.complexity] ?? activeFaction.complexity}</span>
            <span><i>条目</i>{activeFaction.cards.length}</span>
            <span><i>牌数</i>{activeFaction.cards.reduce((sum, card) => sum + card.quantity, 0)}</span>
          </div>

          {activeFaction.mechanics.length > 0 && (
            <div className="mechanics" aria-label="种族机制">
              {activeFaction.mechanics.map((mechanic) => <span key={mechanic}>{mechanic}</span>)}
            </div>
          )}

          <div className="filterRow" aria-label="按类型筛选">
            {Object.entries(TYPE_LABEL).map(([value, label]) => (
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
            <nav className="cardList" aria-label="当前种族的卡牌">
              <div className="cardListHeader">
                <span>03 / CARDS</span>
                <b>{visibleCards.length}</b>
              </div>
              {visibleCards.map((card) => (
                <button
                  className={card.id === currentCard?.id ? "cardRow active" : "cardRow"}
                  key={card.id}
                  onClick={() => setSelectedCard(card.id)}
                >
                  <span className="typeMark">{TYPE_LABEL[card.type]}</span>
                  <span className="cardRowName">{card.name}</span>
                  <strong>×{card.quantity}</strong>
                </button>
              ))}
              {!visibleCards.length && <p className="emptyList">此筛选下没有卡牌。</p>}
            </nav>

            <section className="cardStage" aria-live="polite">
              {currentCard ? (
                <>
                  <div className="stageTop">
                    <span>第 {cardIndex + 1} / {visibleCards.length} 张</span>
                    <div className="stepButtons">
                      <button onClick={() => goToCard(-1)} aria-label="上一张卡">←</button>
                      <button onClick={() => goToCard(1)} aria-label="下一张卡">→</button>
                    </div>
                  </div>

                  <article className={"cardFace " + currentCard.type}>
                    <div className="cardFaceTop">
                      <span>{TYPE_LABEL[currentCard.type]}</span>
                      <span>×{currentCard.quantity}</span>
                    </div>
                    <div className="cardNameBlock">
                      <h3>{currentCard.name}</h3>
                      <p>{activeFaction.name}</p>
                    </div>
                    <div className="cardStats">
                      {currentCard.power !== null && <span><b>{currentCard.power}</b>力量</span>}
                      {currentCard.breakpoint !== null && <span><b>{currentCard.breakpoint}</b>临界点</span>}
                      {currentCard.vp && <span><b>{currentCard.vp.join(" / ")}</b>胜利点</span>}
                    </div>
                    <p className="cardRules">{currentCard.text}</p>
                    <div className="cardFaceBottom">
                      <span>{currentCard.sourceProvider ?? activeFaction.sourceProvider ?? "资料来源"}</span>
                      <span>SMASH UP</span>
                    </div>
                  </article>

                  <div className="cardNotes">
                    <div className="errataNote">
                      <span>勘误状态</span>
                      <b>{currentCard.errata}</b>
                    </div>
                    {currentCard.clarifications.length > 0 && (
                      <details>
                        <summary>规则说明（{currentCard.clarifications.length}）</summary>
                        <ul>
                          {currentCard.clarifications.map((note) => <li key={note}>{note}</li>)}
                        </ul>
                      </details>
                    )}
                  </div>
                </>
              ) : (
                <div className="emptyStage">
                  <p>换一个筛选条件，继续翻牌。</p>
                </div>
              )}
            </section>
          </div>
        </section>
      </section>

      <footer>
        <div>
          <p className="eyebrow">SOURCES & SCOPE</p>
          <p>
            本站只收录种族卡组（20 张牌）与关联泰坦；基地牌不在本目录中。
            中文界面配合英文卡牌原文，避免翻译歧义。
          </p>
        </div>
        <div className="footerLinks">
          {(catalog.source.sources ?? [{ name: catalog.source.name, url: catalog.source.url }]).map((source) => (
            <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.name} ↗</a>
          ))}
        </div>
      </footer>
    </main>
  );
}
