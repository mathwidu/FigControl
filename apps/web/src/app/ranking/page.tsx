import type { Metadata } from "next";
import { LeaderboardPage } from "../../components/LeaderboardPage";

export const metadata: Metadata = {
  title: "Ranking | FigControl Copa 2026",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Ranking() {
  return <LeaderboardPage />;
}
