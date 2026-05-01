import type { Metadata } from "next";
import { AdminDashboardPage } from "../../components/AdminDashboardPage";

export const metadata: Metadata = {
  title: "Admin | FigControl Copa 2026",
  description: "Painel interno de acompanhamento do FigControl.",
};

export default function AdminPage() {
  return <AdminDashboardPage />;
}
