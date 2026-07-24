"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FeedbackModal } from "./feedback-modal";
import { Video, UserX, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";

interface Interview {
    interview_id: string;
    candidate_name: string;
    job_title: string;
    start_time_utc: string;
    meet_link: string;
    ai_match_report: any;
    status: "CONFIRMED" | "COMPLETED" | "NO_SHOW" | "OFFERED" | "INTERVIEWER_NO_SHOW_CLAIMED";
}

export function UpcomingQueue() {
    const queryClient = useQueryClient();
    const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null);
    const [isReporting, setIsReporting] = useState<string | null>(null);
    const [now, setNow] = useState(Date.now());

    // update 'now' every minute to dynamically enable the No-Show button
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 60000);
        return () => clearInterval(interval);
    }, []);

    const { data: interviews, isLoading } = useQuery<Interview[]>({
        queryKey: ["upcoming-interviews"],
        queryFn: async () => {
            const response = await api.get("/scheduling/interviews/upcoming");
            return response.data;
        },
    });

    const handleNoShow = async (interviewId: string) => {
        if (!confirm("Are you sure? This will penalize the candidate and boost your reliability score.")) return;

        setIsReporting(interviewId);
        try {
            await api.post(`/interviews/${interviewId}/candidate-no-show`);
            toast.success("Candidate marked as no-show.");
            queryClient.invalidateQueries({ queryKey: ["upcoming-interviews"] });
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to report no-show.");
        } finally {
            setIsReporting(null);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
            </div>
        );
    }

    if (!interviews || interviews.length === 0) {
        return (
            <div className="p-8 border-2 border-dashed rounded-xl flex items-center justify-center text-muted-foreground bg-card/50">
                No upcoming interviews scheduled.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {interviews.map((interview) => (
                <Card key={interview.interview_id} className="shadow-sm border transition-all hover:shadow-ambient">
                    <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg">{interview.candidate_name}</h3>
                                <Badge variant="secondary">{interview.job_title}</Badge>
                                {interview.status === "INTERVIEWER_NO_SHOW_CLAIMED" && (
                                    <Badge variant="destructive" className="ml-2">Candidate Claimed No-Show</Badge>
                                )}
                            </div>
                            <p className="text-muted-foreground text-sm">
                                {format(new Date(interview.start_time_utc), "EEEE, MMMM do • h:mm a")}
                            </p>
                            {interview.status === "INTERVIEWER_NO_SHOW_CLAIMED" && (
                                <p className="text-xs text-destructive mt-1 font-medium">
                                    Submit feedback to override this claim and verify attendance.
                                </p>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {interview.meet_link && (
                                <Button variant="outline" asChild>
                                    <a href={interview.meet_link} target="_blank" rel="noopener noreferrer">
                                        <Video className="h-4 w-4 mr-2 text-primary" />
                                        Join Meet
                                    </a>
                                </Button>
                            )}

                            {interview.ai_match_report && (
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline">
                                            <FileText className="h-4 w-4 mr-2 text-blue-500" />
                                            AI Report
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>AI Match Report for {interview.candidate_name}</DialogTitle>
                                            <DialogDescription>Automated pre-screening analysis.</DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                            <div>
                                                <h4 className="font-semibold text-sm">Fit Score</h4>
                                                <p className="text-xl font-bold">{interview.ai_match_report.fit_score}/10</p>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-sm">Summary</h4>
                                                <p className="text-sm text-muted-foreground">{interview.ai_match_report.summary}</p>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-sm">Matched Skills</h4>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {interview.ai_match_report.matched_skills?.map((skill: string, i: number) => (
                                                        <Badge key={i} variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">{skill}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-sm">Missing Skills</h4>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {interview.ai_match_report.missing_skills?.map((skill: string, i: number) => (
                                                        <Badge key={i} variant="outline" className="text-xs text-red-500 border-red-200">{skill}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            )}

                            <Button
                                variant="outline"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => handleNoShow(interview.interview_id)}
                                disabled={isReporting === interview.interview_id || now < new Date(interview.start_time_utc).getTime() + 15 * 60000}
                                title={now < new Date(interview.start_time_utc).getTime() + 15 * 60000 ? "Available 15 minutes after interview starts" : ""}
                            >
                                <UserX className="h-4 w-4 mr-2" />
                                No-Show
                            </Button>
                            <Button onClick={() => setSelectedInterviewId(interview.interview_id)}>
                                Submit Feedback
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}

            <FeedbackModal
                interviewId={selectedInterviewId}
                isOpen={!!selectedInterviewId}
                onClose={() => setSelectedInterviewId(null)}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ["upcoming-interviews"] });
                }}
            />
        </div>
    );
}