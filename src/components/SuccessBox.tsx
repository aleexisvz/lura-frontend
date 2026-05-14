type Props = {
  message: string;
};

export function SuccessBox({ message }: Props) {
  return <p className="success-text">{message}</p>;
}
