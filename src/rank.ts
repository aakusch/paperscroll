import type { Paper, Topic } from "./data.js";
import type { User } from "./api.js";

export type Prefs = {
  interests: Topic[];
  workingOn: string;
};

export const emptyPrefs: Prefs = { interests: [], workingOn: "" };

export function prefsFromUser(account: User | null): Prefs {
  if (!account) return emptyPrefs;
  return {
    interests: account.interests ?? [],
    workingOn: account.workingOn ?? "",
  };
}

export function inFocus(paper: Paper, prefs: Prefs) {
  if (prefs.interests.length === 0) return true;
  return prefs.interests.includes(paper.topic);
}

export function composeBoard(papers: Paper[], prefs: Prefs) {
  const focus = papers.filter((paper) => inFocus(paper, prefs));
  const rest = papers.filter((paper) => !inFocus(paper, prefs));
  return { focus, rest };
}
