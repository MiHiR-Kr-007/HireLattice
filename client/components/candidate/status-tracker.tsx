"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Circle, Clock, VideoOff } from "lucide-react";

interface CandidateStatus {
    id: string;
    job_title: string;
    status: "APPLIED" | "RANKED" | "SCHEDULED" | "INTERVIEWED" | "HIRED" | "REJECTED";
    interview_id?: string;
    meet_link?: string;
}

const STATUS_STEPS = ["APPLIED", "RANKED", "SCHEDULED", "INTERVIEWED", "DECISION"];

export function StatusTracker() {
    const [isReporting, setIsReporting] = useState(false);

    const { data: application, isLoading } = useQuery<CandidateStatus>({
        queryKey: ["candidate-status"],
        queryFn: async () => {
            const response = await api.get("/applications/me");
            return response.data;
        },
    });

    const handleInterviewerNoShow = async () => {
        if (!application?.interview_id) return;
        if (!confirm("Are you sure? This will report the interviewer and reset you in the matchmaking queue.")) return;

        setIsReporting(true);
        try {
            await api.post(`/interviews/${application.interview_id}/interviewer-no-show`);
            toast.success("Reported. You have been placed back in the scheduling queue.");
            window.location.reload();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to report no-show.");
        } finally {
            setIsReporting(false);
        }
    };

    if (isLoading) return <Skeleton className="h-64 w-full max-w-2xl mx-auto rounded-xl" />;

    if (!application) {
        return (
            <div className="text-center p-12 border-2 border-dashed rounded-xl text-muted-foreground mt-8">
                No active applications found.
            </div>
        );
    }

    let currentStepIndex = STATUS_STEPS.indexOf(application.status);
    if (application.status === "HIRED" || application.status === "REJECTED") {
        currentStepIndex = 4; // decision
    }

    return (
        <Card className="shadow-ambient border-none max-w-3xl mx-auto mt-8">
            <CardHeader className="border-b bg-muted/20 pb-6">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-2xl mb-1">{application.job_title}</CardTitle>
                        <p className="text-muted-foreground text-sm flex items-center gap-1">
                            <Clock className="h-4 w-4" /> Application Status Pipeline
                        </p>
                    </div>
                    {application.status === "HIRED" && <Badge className="bg-emerald-500">Hired</Badge>}
                    {application.status === "REJECTED" && <Badge variant="destructive">Rejected</Badge>}
                </div>
            </CardHeader>
            <CardContent className="pt-8">
                
                {/* Visual Pipeline */}
                <div className="flex justify-between items-center relative mb-12">
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-muted -z-10 -translate-y-1/2 rounded-full"></div>
                    <div 
                        className="absolute top-1/2 left-0 h-1 bg-primary -z-10 -translate-y-1/2 transition-all duration-500 rounded-full"
                        style={{ width: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
                    ></div>
                    
                    {STATUS_STEPS.map((step, index) => {
                        const isCompleted = index <= currentStepIndex;
                        const isActive = index === currentStepIndex;
                        
                        return (
                            <div key={step} className="flex flex-col items-center gap-2 bg-background px-2">
                                {isCompleted ? (
                                    <CheckCircle2 className={`h-8 w-8 ${isActive ? "text-primary scale-110 shadow-sm" : "text-primary/60"}`} />
                                ) : (
                                    <Circle className="h-8 w-8 text-muted-foreground/30 bg-background rounded-full" />
                                )}
                                <span className={`text-xs font-semibold ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                                    {step}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {application.status === "SCHEDULED" && (
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 flex flex-col items-center text-center space-y-4">
                        <p className="font-medium">Your interview is scheduled and confirmed.</p>
                        <div className="flex gap-4">
                            {application.meet_link && (
                                <Button asChild>
                                    <a href={application.meet_link} target="_blank" rel="noopener noreferrer">
                                        Join Google Meet
                                    </a>
                                </Button>
                            )}
                            <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={handleInterviewerNoShow} disabled={isReporting}>
                                <VideoOff className="h-4 w-4 mr-2" />
                                Report Interviewer No-Show
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}