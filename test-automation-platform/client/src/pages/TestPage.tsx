export default function TestPage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="p-8">
        <h1 className="text-4xl font-bold text-white bg-red-500 p-4">
          TEST - If this has a red background, Tailwind is working
        </h1>
        <div className="mt-4 p-4 bg-blue-500 text-white">
          Blue background test
        </div>
        <div className="mt-4 p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          Gradient test
        </div>
      </div>
    </div>
  );
}