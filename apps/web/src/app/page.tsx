import { Suspense } from "react";
import { AlbumApp } from "../components/AlbumApp";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="notice">Carregando álbum...</div>}>
      <AlbumApp />
    </Suspense>
  );
}
