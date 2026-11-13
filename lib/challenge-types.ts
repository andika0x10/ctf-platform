export const categoryNames: Record<string, string> = { web: "Web", crypto: "Crypto", forensics: "Forensics", reverse: "Reverse", misc: "Misc" };
export const difficultyNames: Record<string, string> = { easy: "Mudah", medium: "Sedang", hard: "Sulit" };
export const challengeStatusNames: Record<string, string> = { draft: "Draft", published: "Terbit" };
export type DownloadLink = { name: string; url: string };
export type ChallengeDocument = {
  id: string; title: string; category: string; difficulty: string; description: string;
  connectionInfo: string; links: DownloadLink[]; hint: string;
  initialPoints: number; minimumPoints: number; decay: number; status: string;
  revision: number; createdAt: string; updatedAt: string;
};
