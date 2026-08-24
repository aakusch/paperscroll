import type { ReactNode } from "react";
import { Img, Interactive, staticFile } from "remotion";
import { colors, sans, serif } from "../theme";

export const AppChrome = ({
  children,
  active = "Today",
  contentWidth = 720,
}: {
  children: ReactNode;
  active?: "Today" | "Saved" | "Agent" | "About";
  contentWidth?: number;
}) => {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "184px minmax(0, 1fr)",
        height: "100%",
        width: "100%",
        backgroundColor: colors.bg,
        fontFamily: sans,
        color: colors.ink,
        overflow: "hidden",
      }}
    >
      <aside
        style={{
          minWidth: 0,
          height: "100%",
          borderRight: `1px solid ${colors.line}`,
          padding: "24px 18px 20px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: 24,
        }}
      >
        <Img
          src={staticFile("favicon.png")}
          style={{ width: 34, height: 34, display: "block" }}
        />
        <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {(["Today", "Saved", "Agent", "About"] as const).map((item) => (
            <div
              key={item}
              style={{
                padding: "7px 10px",
                borderLeft: `2px solid ${item === active ? colors.accent : "transparent"}`,
                fontSize: 15,
                color: item === active ? colors.ink : colors.mute,
              }}
            >
              {item === "Today" ? "The board" : item}
            </div>
          ))}
        </nav>
        <div style={{ marginTop: "auto", padding: "6px 10px", color: colors.mute, fontSize: 14 }}>Sign in</div>
      </aside>
      <main
        style={{
          flex: 1,
          padding: "22px 40px 12px",
          minWidth: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: contentWidth,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
};

export const FocusFrame = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      height: "100%",
      width: "100%",
      backgroundColor: colors.bg,
      fontFamily: sans,
      color: colors.ink,
      display: "flex",
      justifyContent: "center",
      padding: "36px 56px 28px",
      boxSizing: "border-box",
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: 880,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        height: "100%",
      }}
    >
      {children}
    </div>
  </div>
);

export const Pill = ({
  children,
  primary,
  size = "md",
}: {
  children: ReactNode;
  primary?: boolean;
  size?: "sm" | "md";
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      whiteSpace: "nowrap",
      backgroundColor: primary ? colors.ink : colors.card,
      color: primary ? "#f7f7f4" : colors.ink,
      border: `1px solid ${primary ? colors.ink : colors.line}`,
      borderRadius: 10,
      padding: size === "sm" ? "8px 14px" : "10px 18px",
      fontSize: size === "sm" ? 15 : 17,
      fontWeight: 500,
      lineHeight: 1,
    }}
  >
    {children}
  </div>
);

const clamp2: React.CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

export const PaperCardMock = ({
  arxivId,
  title,
  authors,
  hostLine,
  verdict = "Watch",
  listed,
  topic,
  boardRank,
}: {
  arxivId: string;
  title: string;
  authors: string;
  hostLine: string;
  verdict?: "Try" | "Watch" | "Skip";
  listed: string;
  topic?: string;
  boardRank?: number;
}) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "100px minmax(0, 1fr)",
        gap: 16,
        alignItems: "start",
        backgroundColor: colors.card,
        padding: "14px 18px",
        minWidth: 0,
        borderBottom: `1px solid ${colors.line}`,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: 100,
          height: 125,
          overflow: "hidden",
          border: `1px solid ${colors.line}`,
          borderRadius: 8,
          backgroundColor: "#f7f6f2",
        }}
      >
        <Img
          src={staticFile(`previews/${arxivId}.jpg`)}
          style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "top center" }}
        />
      </div>
      <div style={{ minWidth: 0 }}>
        {topic ? (
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: colors.mute,
              marginBottom: 4,
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <span>{topic}</span>
            {boardRank != null ? (
              <span style={{ color: colors.accent, fontVariantNumeric: "tabular-nums" }}>
                Board {String(boardRank).padStart(2, "0")}
              </span>
            ) : null}
          </div>
        ) : null}
        <div
          style={{
            fontFamily: serif,
            fontSize: 19,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            lineHeight: 1.22,
            marginBottom: 5,
            ...clamp2,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.35, color: colors.mute, marginBottom: 6 }}>
          {listed.replace("First appeared ", "")} · {authors}
        </div>
        <div
          style={{
            fontFamily: sans,
            fontSize: 14,
            fontWeight: 400,
            lineHeight: 1.4,
            color: "#3f3f3a",
            display: "-webkit-box",
            WebkitLineClamp: 1,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          <span
            style={{
              marginRight: 7,
              color: verdict === "Try" ? "#2f6b4f" : verdict === "Watch" ? "#8a6a24" : colors.mute,
              fontFamily: sans,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {verdict}
          </span>
          {hostLine}
        </div>
      </div>
  </div>
);

function abstractGrafs(text: string) {
  const one = text.replace(/\s+/g, " ").trim();
  const sentences = one.split(/(?<=[.?!])\s+(?=[A-Z“"(])/);
  if (sentences.length < 3) return [one];
  const grafs: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    grafs.push(sentences.slice(i, i + 2).join(" "));
  }
  return grafs;
}

export const AbstractBlock = ({
  name,
  text,
  panelHeight,
  chevron,
  textTranslate = "0px 0px",
}: {
  name: string;
  text: string;
  panelHeight: number;
  chevron: string;
  textTranslate?: string;
}) => {
  const open = panelHeight > 8;
  return (
    <Interactive.Div
      name={name}
      style={{
        margin: "12px 0 8px",
        backgroundColor: "#f6f1e8",
        borderRadius: 12,
        borderLeft: `2px solid ${colors.accent}`,
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <Interactive.Div
        name={`${name}Summary`}
        style={{
          display: "flex",
          alignItems: "center",
          padding: "11px 16px 11px 18px",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: open ? colors.ink : colors.mute,
          borderBottom: open ? "1px solid rgba(28, 28, 26, 0.1)" : "1px solid transparent",
        }}
      >
        Abstract
        <span style={{ marginLeft: "auto", rotate: chevron, color: colors.mute, fontSize: 12 }}>▾</span>
      </Interactive.Div>
      <Interactive.Div
        name={`${name}Panel`}
        style={{
          maxHeight: panelHeight,
          opacity: open ? 1 : 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 20px 18px",
            fontFamily: serif,
            fontSize: 17,
            fontWeight: 500,
            lineHeight: 1.8,
            letterSpacing: "0.005em",
            color: "#2a2a26",
            maxWidth: "40rem",
            translate: textTranslate,
          }}
        >
          {abstractGrafs(text).map((graf, i, all) => (
            <p key={graf.slice(0, 40)} style={{ margin: i === all.length - 1 ? 0 : "0 0 0.9em" }}>
              {graf}
            </p>
          ))}
        </div>
      </Interactive.Div>
    </Interactive.Div>
  );
};

export const VoiceSwitch = ({ t, shift }: { t: number; shift: string }) => (
  <div
    style={{
      position: "relative",
      display: "inline-flex",
      padding: 3,
      border: `1px solid ${colors.line}`,
      borderRadius: 999,
      backgroundColor: colors.card,
    }}
  >
    <Interactive.Div
      name="VoiceThumb"
      style={{
        position: "absolute",
        top: 3,
        left: 3,
        width: 64,
        height: 28,
        borderRadius: 999,
        backgroundColor: colors.ink,
        translate: shift,
      }}
    />
    <div
      style={{
        position: "relative",
        width: 64,
        height: 28,
        display: "grid",
        placeItems: "center",
        fontSize: 13,
        fontWeight: 600,
        color: t < 0.5 ? "#f4f4f0" : colors.mute,
      }}
    >
      Field
    </div>
    <div
      style={{
        position: "relative",
        width: 64,
        height: 28,
        display: "grid",
        placeItems: "center",
        fontSize: 13,
        fontWeight: 600,
        color: t >= 0.5 ? "#f4f4f0" : colors.mute,
      }}
    >
      Plain
    </div>
  </div>
);
