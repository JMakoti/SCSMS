import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <div className="flex flex-col items-center justify-center gap-4">
        <Image
          src="/logo.png"
          alt="School Management Logo"
          width={200}
          height={200}
          className="rounded-full"
          loading="eager"
        />
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white">
          Welcome to School Management
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Manage your school efficiently and effectively.
        </p>
      </div>
    </div>
  );
}
