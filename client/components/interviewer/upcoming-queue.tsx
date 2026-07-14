"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FeedbackModal } from "./feedback-modal";
import { Video, UserX } from "lucide-react";

interface Interview {
    interview_id: string;
    candidate_name: string;
    job_title: string;
    start_time_utc: string;
    meet_link: string;
    status: "CONFIRMED" | "COMPLETED" | "NO_SHOW" | "OFFERED";
}

export function UpcomingQueue() {
    const queryClient = useQueryClient();
    const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null);
    const [isReporting, setIsReporting] = useState<string | null>(null);

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
                            </div>
                            <p className="text-muted-foreground text-sm">
                                {format(new Date(interview.start_time_utc), "EEEE, MMMM do • h:mm a")}
                            </p>
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
                            <Button 
                                variant="outline" 
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => handleNoShow(interview.interview_id)}
                                disabled={isReporting === interview.interview_id}
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