import type { Metadata } from "next";
import { ProfilePage } from "../../components/ProfilePage";

export const metadata: Metadata = {
  title: "Perfil | FigControl Copa 2026",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Perfil() {
  return <ProfilePage />;
}
