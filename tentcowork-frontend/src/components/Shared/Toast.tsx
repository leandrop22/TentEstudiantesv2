interface Props {
  message: string;
  type?: 'success' | 'error';
}

export default function Toast({ message, type = 'success' }: Props) {
  const color = type === 'success' ? 'bg-green-600' : 'bg-red-600';
  return (
    <div className={`text-white text-sm py-2 px-4 rounded mt-4 text-center ${color}`}>
      {message}
    </div>
  );
}
