"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Circle, Clock, VideoOff, BriefcaseBusiness, ChevronRight } from "lucide-react";

interface CandidateStatus {
    application_id: string;
    job_title: string;
    status: "APPLIED" | "RANKED" | "SCHEDULED" | "INTERVIEWED" | "HIRED" | "REJECTED";
    created_at: string;
    interview_id?: string;
    meet_link?: string;
    start_time_utc?: string;
}

const STATUS_STEPS = ["APPLIED", "RANKED", "SCHEDULED", "INTERVIEWED", "DECISION"];

export function StatusTracker() {
    const [isReporting, setIsReporting] = useState<string | null>(null);
    const [selectedApp, setSelectedApp] = useState<CandidateStatus | null>(null);
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 60000);
        return () => clearInterval(interval);
    }, []);

    const { data: applications, isLoading } = useQuery<CandidateStatus[]>({
        queryKey: ["candidate-status"],
        queryFn: async () => {
            const response = await api.get("/applications/me");
            return response.data;
        },
    });

    const handleInterviewerNoShow = async (interviewId: string) => {
        if (!confirm("Are you sure? This will report the interviewer and reset you in the matchmaking queue.")) return;

        setIsReporting(interviewId);
        try {
            await api.post(`/interviews/${interviewId}/interviewer-no-show`);
            toast.success("Reported. You have been placed back in the scheduling queue.");
            window.location.reload();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to report no-show.");
        } finally {
            setIsReporting(null);
        }
    };

    if (isLoading) return <Skeleton className="h-64 w-full max-w-2xl mx-auto rounded-xl mt-8" />;

    if (!applications || applications.length === 0) {
        return (
            <div className="text-center p-12 border-2 border-dashed rounded-xl text-muted-foreground mt-8 max-w-3xl mx-auto">
                No active applications found. Browse jobs and apply to see your status pipeline here!
            </div>
        );
    }

    let selectedAppStepIndex = 0;
    if (selectedApp) {
        selectedAppStepIndex = STATUS_STEPS.indexOf(selectedApp.status);
        if (selectedApp.status === "HIRED" || selectedApp.status === "REJECTED") {
            selectedAppStepIndex = 4; // decision
        }
    }

    return (
        <div className="space-y-4 mt-8 max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">My Applications</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {applications.map((app) => (
                    <Card 
                        key={app.application_id} 
                        className="shadow-sm border transition-all hover:shadow-ambient hover:border-primary/50 cursor-pointer group"
                        onClick={() => setSelectedApp(app)}
                    >
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <BriefcaseBusiness className="h-4 w-4 text-primary" />
                                        {app.job_title}
                                    </CardTitle>
                                    <CardDescription>Applied on {format(new Date(app.created_at), "MMM d, yyyy")}</CardDescription>
                                </div>
                                <ChevronRight className="text-muted-foreground group-hover:text-primary transition-colors h-5 w-5" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Status:</span>
                                <Badge variant={app.status === "HIRED" ? "default" : app.status === "REJECTED" ? "destructive" : "secondary"}>
                                    {app.status}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
                <DialogContent className="max-w-3xl border-none shadow-ambient p-0 overflow-hidden">
                    {selectedApp && (
                        <>
                            <div className="p-6 pb-4 bg-muted/20 border-b">
                                <DialogHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <DialogTitle className="text-2xl mb-1">{selectedApp.job_title}</DialogTitle>
                                            <p className="text-muted-foreground text-sm flex items-center gap-1">
                                                <Clock className="h-4 w-4" /> Application Status Pipeline
                                            </p>
                                        </div>
                                        {selectedApp.status === "HIRED" && <Badge className="bg-emerald-500">Hired</Badge>}
                                        {selectedApp.status === "REJECTED" && <Badge variant="destructive">Rejected</Badge>}
                                    </div>
                                </DialogHeader>
                            </div>
                            
                            <div className="p-8">
                                {/* Visual Pipeline */}
                                <div className="flex justify-between items-center relative mb-12">
                                    <div className="absolute top-1/2 left-0 w-full h-1 bg-muted -z-10 -translate-y-1/2 rounded-full"></div>
                                    <div 
                                        className="absolute top-1/2 left-0 h-1 bg-primary -z-10 -translate-y-1/2 transition-all duration-500 rounded-full"
                                        style={{ width: `${(selectedAppStepIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
                                    ></div>
                                    
                                    {STATUS_STEPS.map((step, index) => {
                                        const isCompleted = index <= selectedAppStepIndex;
                                        const isActive = index === selectedAppStepIndex;
                                        
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

                                {selectedApp.status === "SCHEDULED" && (
                                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 flex flex-col items-center text-center space-y-4">
                                        <p className="font-medium">Your interview is scheduled and confirmed.</p>
                                        <div className="flex gap-4">
                                            {selectedApp.meet_link && (
                                                <Button asChild>
                                                    <a href={selectedApp.meet_link} target="_blank" rel="noopener noreferrer">
                                                        Join Google Meet
                                                    </a>
                                                </Button>
                                            )}
                                            {selectedApp.interview_id && (
                                                <Button 
                                                    variant="outline" 
                                                    className="text-destructive hover:bg-destructive/10" 
                                                    onClick={() => handleInterviewerNoShow(selectedApp.interview_id!)} 
                                                    disabled={isReporting === selectedApp.interview_id || (selectedApp.start_time_utc ? now < new Date(selectedApp.start_time_utc).getTime() + 15 * 60000 : false)}
                                                    title={selectedApp.start_time_utc && now < new Date(selectedApp.start_time_utc).getTime() + 15 * 60000 ? "Available 15 minutes after interview starts" : ""}
                                                >
                                                    <VideoOff className="h-4 w-4 mr-2" />
                                                    Report Interviewer No-Show
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}