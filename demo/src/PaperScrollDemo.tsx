import type { ReactNode } from "react";
import { AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { boardPapers, type DemoPaper } from "./papers";
import { colors, sans, serif } from "./theme";
import { AbstractBlock, AppChrome, PaperCardMock, Pill, VoiceSwitch } from "./ui/chrome";

const agentSans = "Inter, ui-sans-serif, system-ui, sans-serif";

export const DEMO_DURATION = 900;

const traces = boardPapers[1];
const stats = boardPapers[4];
const n = boardPapers.length;
const move = Easing.bezier(0.22, 1, 0.36, 1);
const linear = Easing.linear;
const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const xf = 14;

const beat = {
  collate: 0,
  wall: 120,
  line: 210,
  catch: 306,
  plain: 408,
  stats: 510,
  caught: 648,
  agent: 744,
};

export const PaperScrollDemo: React.FC = () => {
  const frame = useCurrentFrame();

  const collateOp = fadeOut(frame, beat.wall);
  const tracesOp = cross(frame, beat.wall, beat.stats);
  const statsOp = cross(frame, beat.stats, beat.caught);
  const caughtOp = cross(frame, beat.caught, beat.agent);
  const productOp = interpolate(frame, [beat.agent - 8, beat.agent + 8], [1, 0], { ...clamp, easing: move });
  const agentOp = interpolate(frame, [beat.agent, beat.agent + xf], [0, 1], { ...clamp, easing: move });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, overflow: "hidden", fontFamily: sans, color: colors.ink }}>
      <Interactive.Div name="PaperScrollProduct" style={{ position: "absolute", inset: 0, opacity: productOp }}>
        <AppChrome contentWidth={760}>
          <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
            <Plate name="BoardSequence" opacity={collateOp}>
              <CollateSheet frame={frame} />
            </Plate>
            <Plate name="TracesRoutine" opacity={tracesOp}>
              <RoutineBar step="2" />
              <TracesSheet frame={frame} />
            </Plate>
            <Plate name="StatsRoutine" opacity={statsOp}>
              <RoutineBar step="5" />
              <HostSheet paper={stats} />
            </Plate>
            <Plate name="CaughtUp" opacity={caughtOp}>
              <HandoffSheet frame={frame} />
            </Plate>
          </div>
        </AppChrome>
      </Interactive.Div>
      <Plate name="ExternalAgent" opacity={agentOp}>
        <AgentSheet frame={frame} />
      </Plate>
    </AbsoluteFill>
  );
};

function fadeOut(frame: number, at: number) {
  return interpolate(frame, [at, at + xf], [1, 0], { ...clamp, easing: move });
}

function cross(frame: number, start: number, end: number) {
  const inn = interpolate(frame, [start, start + xf], [0, 1], { ...clamp, easing: move });
  const out = interpolate(frame, [end, end + xf], [1, 0], { ...clamp, easing: move });
  return Math.min(inn, out);
}

function Plate({ name, opacity, children }: { name: string; opacity: number; children: ReactNode }) {
  return (
    <Interactive.Div
      name={name}
      style={{
        position: "absolute",
        inset: 0,
        opacity,
        display: "flex",
        flexDirection: "column",
        pointerEvents: opacity > 0.05 ? "auto" : "none",
      }}
    >
      {children}
    </Interactive.Div>
  );
}

function RoutineBar({ step }: { step: string }) {
  const progress = (Number(step) / n) * 100;
  return (
    <div
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        marginBottom: 12,
        paddingBottom: 16,
        fontSize: 15,
        color: colors.mute,
        flexShrink: 0,
      }}
    >
      <span style={{ color: colors.ink }}>Leave</span>
      <span>
        {step} / {n}
      </span>
      <span style={{ textAlign: "right" }}>Full page</span>
      <div style={{ position: "absolute", right: 0, bottom: 6, left: 0, height: 1, backgroundColor: colors.line }}>
        <div style={{ width: `${progress}%`, height: 1, backgroundColor: colors.accent }} />
      </div>
    </div>
  );
}

function SheetMeta({ paper }: { paper: DemoPaper }) {
  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 14,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: colors.mute,
          marginBottom: 10,
        }}
      >
        <span>{paper.topic}</span>
        <span>{paper.arxivId}</span>
      </div>
      <div
        style={{
          fontFamily: serif,
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: "-0.03em",
          lineHeight: 1.2,
        }}
      >
        {paper.title}
      </div>
      <div style={{ fontSize: 15, color: colors.mute, marginTop: 8, lineHeight: 1.45 }}>
        {paper.listed} · {paper.authors}
      </div>
    </>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: "28px 32px 20px",
        minWidth: 0,
        overflow: "hidden",
        boxSizing: "border-box",
        boxShadow: "0 1px 2px rgba(28, 28, 26, 0.05)",
      }}
    >
      {children}
    </div>
  );
}

function RoutineFoot({ nextPaper }: { nextPaper: DemoPaper }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 0 8px",
        flexShrink: 0,
        marginTop: "auto",
        borderTop: `1px solid ${colors.line}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18, color: colors.mute, fontSize: 13 }}>
        <span>Read paper</span>
        <span>Save for later</span>
      </div>
      <div
        style={{
          minHeight: 38,
          display: "flex",
          alignItems: "center",
          padding: "7px 12px",
          borderRadius: 10,
          boxSizing: "border-box",
          backgroundColor: colors.ink,
          color: "#f7f7f4",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
          Next · {nextPaper.topic} →
        </span>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: colors.mute,
      }}
    >
      {children}
    </div>
  );
}

function TakeLine({ name, n, line, opacity = 1 }: { name: string; n: number; line: string; opacity?: number }) {
  return (
    <Interactive.Div
      name={name}
      style={{
        display: "grid",
        gridTemplateColumns: "28px minmax(0, 1fr)",
        gap: 12,
        padding: "12px 0",
        borderTop: `1px solid ${colors.line}`,
        fontSize: 16,
        lineHeight: 1.5,
        opacity,
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          backgroundColor: "#efece6",
          color: colors.mute,
          fontSize: 12,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 2,
        }}
      >
        {n}
      </span>
      {line}
    </Interactive.Div>
  );
}

function TracesSheet({ frame }: { frame: number }) {
  const absHeight = interpolate(frame, [beat.line, beat.line + 16], [520, 0], { ...clamp, easing: move });
  const chevron = interpolate(frame, [beat.line, beat.line + 16], ["180deg", "0deg"], { ...clamp, easing: move });
  const hostH = interpolate(frame, [beat.line + 4, beat.line + 18], [0, 420], { ...clamp, easing: move });
  const hostIn = interpolate(frame, [beat.line + 6, beat.line + 20], [0, 1], { ...clamp, easing: move });
  const bodyIn = interpolate(frame, [beat.line + 22, beat.line + 36], [0, 1], { ...clamp, easing: move });
  const takeH = interpolate(frame, [beat.catch, beat.catch + 14], [0, 280], { ...clamp, easing: move });
  const voice = interpolate(frame, [beat.plain + 8, beat.plain + 22], [0, 1], { ...clamp, easing: move });
  const voiceShift = interpolate(frame, [beat.plain + 8, beat.plain + 22], ["0px 0px", "64px 0px"], {
    ...clamp,
    easing: move,
  });
  return (
    <>
      <Card>
        <SheetMeta paper={traces} />
        <AbstractBlock name="TracesAbstract" text={traces.abstract} panelHeight={absHeight} chevron={chevron} />
        <Interactive.Div
          name="Host"
          style={{
            maxHeight: hostH,
            opacity: hostIn,
            overflow: "hidden",
            marginTop: 22,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <SectionLabel>Why this paper</SectionLabel>
            <VoiceSwitch t={voice} shift={voiceShift} />
          </div>
          <div style={{ position: "relative", minHeight: 154 }}>
            <Interactive.Div name="FieldVoice" style={{ opacity: 1 - voice }}>
              <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 600, lineHeight: 1.35 }}>
                {traces.fieldWhy}
              </div>
              <Interactive.Div name="FieldBrief" style={{ fontSize: 17, lineHeight: 1.65, color: "#353530", marginTop: 14, opacity: bodyIn }}>
                {traces.fieldBody}
              </Interactive.Div>
            </Interactive.Div>
            <Interactive.Div name="PlainVoice" style={{ position: "absolute", inset: 0, opacity: voice }}>
              <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 600, lineHeight: 1.35 }}>
                {traces.plainWhy}
              </div>
              <div style={{ fontSize: 17, lineHeight: 1.65, color: "#353530", marginTop: 14 }}>
                {traces.plainBody}
              </div>
            </Interactive.Div>
          </div>
        </Interactive.Div>
        <Interactive.Div name="Takes" style={{ maxHeight: takeH, overflow: "hidden", marginTop: 24 }}>
          <SectionLabel>Key takeaways</SectionLabel>
          <div style={{ marginTop: 4, position: "relative", minHeight: 160 }}>
            <Interactive.Div name="FieldTakeaways" style={{ opacity: 1 - voice }}>
              {traces.fieldTakes.map((line, i) => {
                const on = interpolate(frame, [beat.catch + 6 + i * 10, beat.catch + 16 + i * 10], [0, 1], { ...clamp });
                return <TakeLine key={i} name={`FieldTake${i + 1}`} n={i + 1} line={line} opacity={on} />;
              })}
            </Interactive.Div>
            <Interactive.Div name="PlainTakeaways" style={{ position: "absolute", inset: 0, opacity: voice }}>
              {traces.plainTakes.map((line, i) => (
                <TakeLine key={i} name={`PlainTake${i + 1}`} n={i + 1} line={line} />
              ))}
            </Interactive.Div>
          </div>
        </Interactive.Div>
      </Card>
      <RoutineFoot nextPaper={boardPapers[2]} />
    </>
  );
}

function HostSheet({ paper }: { paper: DemoPaper }) {
  return (
    <>
      <Card>
        <SheetMeta paper={paper} />
        <AbstractBlock name="StatsAbstract" text={paper.abstract} panelHeight={0} chevron="0deg" />
        <div style={{ marginTop: 22 }}>
          <SectionLabel>Why this paper</SectionLabel>
          <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 600, lineHeight: 1.35, marginTop: 14 }}>
            {paper.fieldWhy}
          </div>
          <div style={{ fontSize: 17, lineHeight: 1.65, color: "#353530", marginTop: 14 }}>{paper.fieldBody}</div>
        </div>
        <div style={{ marginTop: 28 }}>
          <SectionLabel>Key takeaways</SectionLabel>
          <div style={{ marginTop: 4 }}>
            {paper.fieldTakes.map((line, i) => (
              <TakeLine key={i} name={`StatsTake${i + 1}`} n={i + 1} line={line} />
            ))}
          </div>
        </div>
      </Card>
      <RoutineFoot nextPaper={boardPapers[5]} />
    </>
  );
}


function CollateSheet({ frame }: { frame: number }) {
  const intakeOp = interpolate(frame, [4, 12, 48, 62], [0, 1, 1, 0], { ...clamp, easing: move });
  const boardOp = interpolate(frame, [52, 66], [0, 1], { ...clamp, easing: move });
  const startOp = interpolate(frame, [96, 108], [0, 1], { ...clamp, easing: move });
  const listed = Math.min(n, Math.max(0, Math.floor((frame - 8) / 5)));
  const scroll = interpolate(frame, [70, 112], ["0px 0px", "0px -420px"], { ...clamp, easing: linear });

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 16,
          marginBottom: 14,
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 600, letterSpacing: "-0.03em" }}>
            The board
          </div>
          <div style={{ fontSize: 13, color: colors.mute, marginTop: 5 }}>
            Thu 20 Aug · {listed} / {n} papers
          </div>
        </div>
        <Interactive.Div name="StartRoutine" style={{ opacity: startOp, flexShrink: 0 }}>
          <Pill primary size="sm">
            Start routine
          </Pill>
        </Interactive.Div>
      </div>

      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        <Interactive.Div
          name="MorningNominations"
          style={{
            position: "absolute",
            inset: 0,
            opacity: intakeOp,
            overflow: "hidden",
          }}
        >
          {boardPapers.map((paper, i) => {
            const on = interpolate(frame, [8 + i * 5, 16 + i * 5], [0, 1], { ...clamp, easing: move });
            return (
              <Interactive.Div
                key={paper.arxivId}
                name={`Nomination${i + 1}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "88px 56px minmax(0, 1fr)",
                  gap: 12,
                  alignItems: "baseline",
                  padding: "11px 0",
                  borderBottom: `1px solid ${colors.line}`,
                  opacity: on,
                  translate: interpolate(frame, [8 + i * 5, 16 + i * 5], ["0px 10px", "0px 0px"], {
                    ...clamp,
                    easing: move,
                  }),
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                  {paper.rank != null ? `Daily #${paper.rank}` : paper.topic}
                  {paper.votes != null ? (
                    <span style={{ color: colors.accent, fontWeight: 500 }}> · {paper.votes} votes</span>
                  ) : null}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: colors.mute,
                  }}
                >
                  {paper.topic}
                </span>
                <span
                  style={{
                    fontFamily: serif,
                    fontSize: 16,
                    fontWeight: 600,
                    lineHeight: 1.3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {paper.title}
                </span>
              </Interactive.Div>
            );
          })}
        </Interactive.Div>

        <Interactive.Div
          name="RankedBoard"
          style={{
            position: "absolute",
            inset: 0,
            opacity: boardOp,
            overflow: "hidden",
          }}
        >
          <Interactive.Div
            name="BoardScroll"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 0,
              overflow: "hidden",
              border: `1px solid ${colors.line}`,
              borderRadius: 14,
              backgroundColor: colors.card,
              translate: scroll,
            }}
          >
            {boardPapers.map((paper, i) => {
              const on = interpolate(frame, [56 + i * 6, 68 + i * 6], [0, 1], { ...clamp, easing: move });
              return (
                <Interactive.Div
                  key={paper.arxivId}
                  name={`Intake${i + 1}`}
                  style={{
                    opacity: on,
                    translate: interpolate(frame, [56 + i * 6, 68 + i * 6], ["0px 18px", "0px 0px"], {
                      ...clamp,
                      easing: move,
                    }),
                  }}
                >
                  <PaperCardMock
                    arxivId={paper.arxivId}
                    topic={paper.topic}
                    title={paper.title}
                    authors={paper.authors}
                    listed={paper.listed}
                    hostLine={paper.fieldWhy}
                    verdict={paper.verdict}
                    boardRank={i + 1}
                  />
                </Interactive.Div>
              );
            })}
          </Interactive.Div>
        </Interactive.Div>
      </div>
    </>
  );
}

function HandoffSheet({ frame }: { frame: number }) {
  const toast = interpolate(frame, [beat.caught + 46, beat.caught + 60], [0, 1], { ...clamp, easing: move });
  const rule = interpolate(frame, [beat.caught + 4, beat.caught + 18], [0, 1], { ...clamp, easing: move });

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        paddingTop: "10vh",
        position: "relative",
      }}
    >
      <div style={{ width: 288, height: 1, marginBottom: 30, backgroundColor: colors.line }}>
        <div style={{ width: "100%", height: 1, backgroundColor: colors.accent, scale: `${rule} 1`, transformOrigin: "left" }} />
      </div>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 999,
          border: `1.5px solid ${colors.accent}`,
          color: colors.accent,
          display: "grid",
          placeItems: "center",
          marginBottom: 18,
        }}
      >
        <svg width="28" height="28" viewBox="0 0 28 28">
          <path
            d="M6.5 14.5 L12 20 L21.5 8.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.mute }}>
        Today · Thu 20 Aug
      </div>
      <div style={{ fontFamily: serif, fontSize: 44, fontWeight: 600, letterSpacing: "-0.03em", marginTop: 8 }}>
        Caught up
      </div>
      <div style={{ fontSize: 16, color: "#353530", marginTop: 12, maxWidth: "28rem", lineHeight: 1.5 }}>
        {n} board packets finished. Save the papers that deserve a full read; the shared top ten stays the same.
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 28, flexWrap: "wrap" }}>
        <Pill primary>Back to the board</Pill>
        <Pill>Open saved</Pill>
      </div>
      <div style={{ marginTop: 28, fontSize: 14, color: colors.mute, lineHeight: 1.5 }}>
        Optional: send the same board packets to an agent for workspace context.
        <br />
        <span style={{ color: colors.ink, textDecoration: "underline" }}>Copy agent handoff</span>
        <span> · Manage digest token</span>
      </div>
      <Interactive.Div
        name="Toast"
        style={{
          position: "absolute",
          left: "50%",
          bottom: 24,
          translate: interpolate(frame, [beat.caught + 46, beat.caught + 60], ["-50% 14px", "-50% 0px"], {
            ...clamp,
            easing: move,
          }),
          opacity: toast,
          backgroundColor: colors.ink,
          color: "#f4f4f0",
          borderRadius: 10,
          padding: "12px 16px",
          fontSize: 14,
          whiteSpace: "nowrap",
        }}
      >
        Prompt copied. The agent needs a digest token from Agent routing.
      </Interactive.Div>
    </div>
  );
}

function AgentSheet({ frame }: { frame: number }) {
  const reply = interpolate(frame, [beat.agent + 22, beat.agent + 38], [0, 1], { ...clamp, easing: move });
  const packet = interpolate(frame, [beat.agent + 44, beat.agent + 60], [0, 1], { ...clamp, easing: move });

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        backgroundColor: "#f4f5f7",
        display: "flex",
        justifyContent: "center",
        padding: "40px 48px 32px",
        boxSizing: "border-box",
        fontFamily: agentSans,
      }}
    >
      <div style={{ width: "100%", maxWidth: 720, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 18,
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: colors.ink }}>Agent</div>
          <div style={{ fontSize: 14, color: colors.mute }}>PaperScroll route · latest complete board</div>
        </div>
        <div
          style={{
            alignSelf: "flex-end",
            width: "86%",
            backgroundColor: "#e8edf3",
            borderRadius: 10,
            padding: "14px 16px",
            fontSize: 14,
            lineHeight: 1.55,
            color: colors.ink,
            fontFamily: "ui-monospace, Menlo, monospace",
          }}
        >
          GET /api/v1/digest/latest
          <br />
          Authorization: Bearer ps_live_…
          <br />
          Accept: application/json
          <br />
          If-None-Match: &quot;previous-etag&quot;
          <br />
          <span style={{ fontFamily: agentSans, color: "#4a4a46" }}>200 · schema 1.1 · complete 10 · process delivery.key once</span>
        </div>
        <Interactive.Div
          name="Place"
          style={{
            opacity: reply,
            marginTop: 16,
            fontSize: 16,
            lineHeight: 1.5,
            color: colors.ink,
            maxWidth: "92%",
          }}
        >
          Traces belongs next to open-weights ingest. SemaPLC is the completion rule if you generate checkable code.
          Stats is a methods stop, not a model card.
        </Interactive.Div>
        <Interactive.Div
          name="BoardPacket"
          style={{
            opacity: packet,
            marginTop: 16,
            backgroundColor: colors.card,
            border: `1px solid ${colors.line}`,
            borderRadius: 14,
            padding: "18px 20px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: colors.accent,
            }}
          >
            PaperScroll packet · AI
          </div>
          <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 600, marginTop: 8, lineHeight: 1.28 }}>
            {traces.title}
          </div>
          <div style={{ marginTop: 14, fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#2f6b4f" }}>
            Verdict · {traces.verdict ?? "Watch"}
          </div>
          <div style={{ fontFamily: serif, fontSize: 19, fontWeight: 600, marginTop: 6, lineHeight: 1.35 }}>
            {traces.fieldWhy}
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.5, color: "#3f3f3a", marginTop: 10 }}>
            <strong>Brief.</strong> {traces.fieldBody}
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.5, color: "#3f3f3a", marginTop: 8 }}>
            <strong>Takeaway.</strong> {traces.fieldTakes[2]}
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.5, color: "#3f3f3a", marginTop: 8 }}>
            <strong>Action.</strong> {traces.actions?.[0]}
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: colors.mute }}>
            Links · PDF · no GitHub listed
          </div>
          <div style={{ marginTop: 10, fontSize: 13, color: colors.mute }}>Mapped onto evals · open-weights ingest</div>
        </Interactive.Div>
      </div>
    </div>
  );
}
