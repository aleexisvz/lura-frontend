type Props = {
  text?: string;
};

export function Loading({ text = "Cargando..." }: Props) {
  return <p className="muted-text">{text}</p>;
}

