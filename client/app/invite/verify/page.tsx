"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

function VerifyLogic() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setErrorMessage("No verification token found in the URL.");
            return;
        }

        const confirmSlot = async () => {
            try {
                await api.post("/scheduling/match/respond", { token, action: "accept" });
                setStatus("success");
            } catch (error: any) {
                setStatus("error");
                setErrorMessage(
                    error.response?.data?.message || "This link has expired or is invalid."
                );
            }
        };

        confirmSlot();
    }, [token]);

    return (
        <Card className="w-full max-w-md shadow-ambient border-none">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl tracking-tight">Interview Scheduling</CardTitle>
                <CardDescription>Matchmaker Verification</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6">

                {status === "loading" && (
                    <div className="flex flex-col items-center space-y-4 text-muted-foreground">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <p>Confirming your interview slot...</p>
                    </div>
                )}

                {status === "success" && (
                    <div className="flex flex-col items-center space-y-4 text-center">
                        <CheckCircle2 className="h-12 w-12 text-primary" />
                        <div className="space-y-1">
                            <h3 className="font-semibold text-lg">Interview Confirmed!</h3>
                            <p className="text-sm text-muted-foreground">
                                Your calendar invite and Google Meet link have been sent to your email.
                            </p>
                        </div>
                        <Button className="mt-4 w-full" onClick={() => window.close()}>
                            Close Window
                        </Button>
                    </div>
                )}

                {status === "error" && (
                    <div className="flex flex-col items-center space-y-4 text-center">
                        <XCircle className="h-12 w-12 text-destructive" />
                        <div className="space-y-1">
                            <h3 className="font-semibold text-lg">Verification Failed</h3>
                            <p className="text-sm text-muted-foreground">{errorMessage}</p>
                        </div>
                        <Button variant="outline" className="mt-4 w-full" onClick={() => window.location.reload()}>
                            Try Again
                        </Button>
                    </div>
                )}

            </CardContent>
        </Card>
    );
}

export default function VerifyPage() {
    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative">
            <div className="absolute top-4 right-4">
                <ThemeToggle />
            </div>
            <Suspense fallback={
                <div className="flex items-center space-x-2 text-primary">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Loading...</span>
                </div>
            }>
                <VerifyLogic />
            </Suspense>
        </div>
    );
}