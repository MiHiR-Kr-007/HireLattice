"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

import { ThemeToggle } from "@/components/theme-toggle";

export default function InterviewerLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await api.post("/auth/logout");
        } catch (e) {
            console.error("Logout failed", e);
        }
        localStorage.removeItem("userRole");
        toast.success("Logged out successfully");
        router.push("/login");
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="sticky top-0 z-10 w-full border-b bg-background/80 backdrop-blur-md">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary">
                        <CalendarDays className="h-6 w-6" />
                        <span className="text-xl font-bold tracking-tight">HireLattice Interviewer</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={handleLogout}>
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-4 py-8">
                {children}
            </main>
        </div>
    );
}