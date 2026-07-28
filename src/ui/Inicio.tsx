import { HomeMainTitle } from "./components/molecules/Home/HomeMainTitle";
import { CreateSubjectForm } from "./components/organism/home/CreateSubjetForm";
import { ListSubjects } from "./components/organism/home/ListSubjects";

export function Inicio({ alAbrir }: { alAbrir: (carpeta: string) => void }) {
  return (
    <div className="pantalla-inicio">
      <HomeMainTitle />
      <CreateSubjectForm alAbrir={alAbrir} />
      <ListSubjects alAbrir={alAbrir} />
    </div>
  );
}
