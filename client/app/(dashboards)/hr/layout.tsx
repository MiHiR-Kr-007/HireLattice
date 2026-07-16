"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, Briefcase } from "lucide-react";
import { toast } from "sonner";

import { ThemeToggle } from "@/components/theme-toggle";

export default function HRLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    const handleLogout = () => {
        localStorage.removeItem("token");
        toast.success("Logged out successfully");
        router.push("/login");
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Minimalist Top Navigation */}
            <header className="sticky top-0 z-10 w-full border-b bg-background/80 backdrop-blur-md">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary">
                        <Briefcase className="h-6 w-6" />
                        <span className="text-xl font-bold tracking-tight">HireLattice HR</span>
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