export default function FormError({ message }) {
  if (!message) return null;

  return (
    <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 text-center ">
      {message}
    </div>
  );
}
