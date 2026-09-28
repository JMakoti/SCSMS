"use client";

import Link from "next/link";

interface PageUnderDevelopmentProps {
    title?: string;
}

export default function PageUnderDevelopment({
    title = "Page",
}: PageUnderDevelopmentProps) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-6 flex-col relative overflow-hidden gap-8">
            <div className="flex flex-col items-center text-center">
                {/* <div className="mb-6 p-4 bg-amber-100 rounded-2xl">
                    <Construction
                        className="w-12 h-12 text-amber-600"
                        strokeWidth={1.5}
                    />
                </div> */}
                <h1 className="text-4xl font-bold text-slate-900 mb-3">
                    {title} Under Development
                </h1>
                <p className="text-slate-600 text-lg mb-8 max-w-sm">
                    Our team is hard at work creating something amazing for you. Check
                    back soon for updates.
                </p>
                <div className="w-64 h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 w-1/2 rounded-full" />
                </div>
            </div>

            {/* CTA button */}
            <div className="flex flex-col sm:flex-row gap-4">
                <Link
                    href="/"
                    className="inline-flex items-center text-orange-500 border borer-orange-500  justify-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all duration-200 active:scale-95"
                >
                    <Home className="w-5 h-5" strokeWidth={2} />
                    Go Home
                </Link>

                <Link
                    href="#"
                    onClick={() => window.history.back()}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all duration-200 active:scale-95"
                    style={{
                        border: "1.5px solid #60a5fa",
                    }}
                >
                    ← Go Back
                </Link>
            </div>
        </div>
    );
}
