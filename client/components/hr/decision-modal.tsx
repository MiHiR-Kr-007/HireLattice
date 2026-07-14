"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, UserCheck, CheckCircle2, XCircle } from "lucide-react";

interface DecisionModalProps {
    candidateId: string | null;
    isOpen: boolean;
    onClose: () => void;
    onDecisionMade: () => void;
}

export function DecisionModal({ candidateId, isOpen, onClose, onDecisionMade }: DecisionModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data: details, isLoading } = useQuery({
        queryKey: ["candidate-details", candidateId],
        queryFn: async () => {
            const response = await api.get(`/candidates/${candidateId}`);
            return response.data;
        },
        enabled: !!candidateId && isOpen,
    });

    const handleDecision = async (decision: "HIRED" | "REJECTED") => {
        setIsSubmitting(true);
        try {
            await api.post(`/candidates/${candidateId}/decision`, { final_decision: decision });
            toast.success(`Candidate has been ${decision.toLowerCase()}!`);
            onDecisionMade();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to submit decision.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-ambient border-none">

                {/* Header */}
                <div className="p-6 pb-4 bg-muted/30">
                    <DialogHeader>
                        <DialogTitle className="text-2xl flex items-center justify-between">
                            <span>{details?.candidate_name || details?.name || "Loading Candidate..."}</span>
                            {details && (
                                <Badge variant="outline" className="text-sm font-normal">
                                    {details.job_title}
                                </Badge>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            Final Review: Compare the AI Resume Analysis against the Human Interview Feedback.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
                            <p>Compiling interview data...</p>
                        </div>
                    ) : details ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 h-full">

                            <ScrollArea className="h-[50vh] p-6 border-r">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                                        <Sparkles className="h-5 w-5" />
                                        <h3 className="font-semibold text-lg">AI Match Report</h3>
                                    </div>

                                    <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-xl border border-purple-100 dark:border-purple-900/50 flex justify-between items-center">
                                        <span className="font-medium">System Fit Score</span>
                                        <Badge variant={details.match_score >= 7 ? "default" : "secondary"} className="text-lg px-3 py-1">
                                            {details.match_score}/10
                                        </Badge>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-semibold mb-2 text-muted-foreground">One-Line Summary</h4>
                                        <p className="text-sm leading-relaxed">{details.ai_match_report?.summary || details.ai_match_report?.Summary}</p>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Matched Skills</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {(details.ai_match_report?.matched_skills || details.ai_match_report?.Matched_Skills)?.map((skill: string) => (
                                                <Badge key={skill} variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300">
                                                    {skill}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Missing Skills</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {(details.ai_match_report?.missing_skills || details.ai_match_report?.Missing_Skills)?.map((skill: string) => (
                                                <Badge key={skill} variant="outline" className="text-muted-foreground border-dashed">
                                                    {skill}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>

                            <ScrollArea className="h-[50vh] p-6 bg-muted/10">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 text-primary">
                                        <UserCheck className="h-5 w-5" />
                                        <h3 className="font-semibold text-lg">Interviewer Feedback</h3>
                                    </div>

                                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex justify-between items-center">
                                        <span className="font-medium">Feedback Details</span>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="text-sm font-semibold mb-1 text-muted-foreground">Technical Assessment</h4>
                                            <p className="text-sm whitespace-pre-wrap">{details.interviews?.[0]?.feedback?.technical_notes}</p>
                                        </div>

                                        <Separator />

                                        <div>
                                            <h4 className="text-sm font-semibold mb-1 text-muted-foreground">Communication & Culture</h4>
                                            <p className="text-sm whitespace-pre-wrap">{details.interviews?.[0]?.feedback?.communication_notes}</p>
                                        </div>

                                        <Separator />

                                        <div>
                                            <h4 className="text-sm font-semibold mb-1 text-muted-foreground">Final Recommendation</h4>
                                            <p className="text-sm font-semibold text-primary">
                                                {details.interviews?.[0]?.feedback?.final_recommendation}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-64 text-destructive">
                            Failed to load candidate data.
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-background border-t flex justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={() => onClose()}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => handleDecision("REJECTED")}
                        disabled={isSubmitting || isLoading}
                    >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                    </Button>
                    <Button
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleDecision("HIRED")}
                        disabled={isSubmitting || isLoading}
                    >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Hire Candidate
                    </Button>
                </div>

            </DialogContent>
        </Dialog>
    );
}