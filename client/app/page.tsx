"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await api.get("/auth/me");
                const role = res.data.user.role;
                if (role === "HR") router.push("/hr");
                else if (role === "INTERVIEWER") router.push("/interviewer");
                else if (role === "CANDIDATE") router.push("/candidate");
                else router.push("/login");
            } catch {
                router.push("/login");
            }
        };
        checkAuth();
    }, [router]);

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative bg-zinc-50 dark:bg-black">
            <div className="absolute top-4 right-4">
                <ThemeToggle />
            </div>
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse">Loading HireLattice...</p>
            </div>
        </div>
    );
}
