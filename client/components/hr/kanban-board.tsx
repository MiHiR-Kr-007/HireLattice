"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DecisionModal } from "./decision-modal";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Users, BrainCircuit, CalendarClock, UserCheck, FileText, RefreshCw, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Candidate {
    id: string;
    candidate_name: string;
    job_title: string;
    resume_url: string;
    status: "APPLIED" | "RANKED" | "SCHEDULED" | "INTERVIEWED";
    match_score?: number;
    ai_match_report?: any;
}

const COLUMNS = [
    { id: "APPLIED", title: "New Applications", icon: Users, color: "text-blue-500" },
    { id: "RANKED", title: "AI Ranked", icon: BrainCircuit, color: "text-purple-500" },
    { id: "SCHEDULED", title: "Scheduled", icon: CalendarClock, color: "text-amber-500" },
    { id: "INTERVIEWED", title: "Awaiting Decision", icon: UserCheck, color: "text-primary" },
];

export function KanbanBoard() {
    const queryClient = useQueryClient();
    const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
    const [aiReportModal, setAiReportModal] = useState<Candidate | null>(null);
    const [isRetrying, setIsRetrying] = useState<string | null>(null);

    const { data: candidates, isLoading } = useQuery<Candidate[]>({
        queryKey: ["pipeline"],
        queryFn: async () => {
            const response = await api.get("/candidates");
            return response.data;
        },
    });

    const handleRetryAi = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setIsRetrying(id);
        try {
            await api.post(`/applications/${id}/retry`);
            toast.success("AI Analysis has been restarted for this candidate.");
            queryClient.invalidateQueries({ queryKey: ["pipeline"] });
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to restart AI analysis.");
        } finally {
            setIsRetrying(null);
        }
    };

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-4">
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-32 w-full rounded-xl" />
                        <Skeleton className="h-32 w-full rounded-xl" />
                    </div>
                ))}
            </div>
        );
    }

    const grouped = COLUMNS.map(col => ({
        ...col,
        items: candidates?.filter(c => c.status === col.id) || []
    }));

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start h-[calc(100vh-250px)]">
            {grouped.map((col) => (
                <div key={col.id} className="flex flex-col h-full bg-muted/40 rounded-xl p-4 border">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <div className="flex items-center gap-2">
                            <col.icon className={`h-5 w-5 ${col.color}`} />
                            <h3 className="font-semibold">{col.title}</h3>
                        </div>
                        <Badge variant="secondary">{col.items.length}</Badge>
                    </div>

                    <ScrollArea className="flex-1 -mx-2 px-2">
                        <div className="space-y-3 pb-4">
                            {col.items.length === 0 ? (
                                <div className="text-center p-4 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                                    No candidates here
                                </div>
                            ) : (
                                col.items.map((candidate) => (
                                    <Card
                                        key={candidate.id}
                                        onClick={() => {
                                            if (candidate.status === "INTERVIEWED") {
                                                setSelectedCandidate(candidate.id);
                                            } else if (candidate.status === "RANKED" && candidate.ai_match_report) {
                                                setAiReportModal(candidate);
                                            }
                                        }}
                                        className={`shadow-sm border transition-all hover:shadow-ambient hover:-translate-y-0.5
                                            ${candidate.status === "INTERVIEWED" || candidate.status === "RANKED" ? "cursor-pointer" : "cursor-default"}
                                            ${candidate.status === "INTERVIEWED" ? "border-primary/50 bg-primary/5" : ""}
                                        `}
                                    >
                                        <CardHeader className="p-4 pb-2 space-y-2">
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-base leading-tight">
                                                        {candidate.candidate_name}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                                        {candidate.job_title}
                                                    </span>
                                                </div>
                                                {candidate.match_score !== undefined && candidate.match_score !== null && (
                                                    <Badge
                                                        variant={candidate.match_score >= 7 ? "default" : "secondary"}
                                                        className="ml-2 shrink-0"
                                                    >
                                                        {candidate.match_score}/10
                                                    </Badge>
                                                )}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-2">
                                            <div className="flex items-center justify-between mt-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 text-xs"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.open(candidate.resume_url, '_blank');
                                                    }}
                                                >
                                                    <FileText className="h-3 w-3 mr-1" />
                                                    Resume
                                                </Button>

                                                {candidate.status === "APPLIED" && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                                        disabled={isRetrying === candidate.id}
                                                        onClick={(e) => handleRetryAi(e, candidate.id)}
                                                    >
                                                        <RefreshCw className={`h-3 w-3 mr-1 ${isRetrying === candidate.id ? "animate-spin" : ""}`} />
                                                        Retry AI
                                                    </Button>
                                                )}

                                                {candidate.status === "RANKED" && (
                                                    <div className="text-xs font-medium text-purple-600 flex items-center">
                                                        <Eye className="h-3 w-3 mr-1" />
                                                        View Report
                                                    </div>
                                                )}

                                                {candidate.status === "INTERVIEWED" && (
                                                    <div className="text-xs font-medium text-primary flex items-center">
                                                        <UserCheck className="h-3 w-3 mr-1" />
                                                        Make Decision
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>
            ))}

            <DecisionModal
                candidateId={selectedCandidate}
                isOpen={!!selectedCandidate}
                onClose={() => setSelectedCandidate(null)}
                onDecisionMade={() => {
                    queryClient.invalidateQueries({ queryKey: ["pipeline"] });
                }}
            />

            {/* AI Report Modal for RANKED candidates */}
            <Dialog open={!!aiReportModal} onOpenChange={(open) => !open && setAiReportModal(null)}>
                <DialogContent className="max-w-md shadow-ambient border-none">
                    <DialogHeader>
                        <DialogTitle className="text-xl text-purple-600 flex items-center gap-2">
                            <BrainCircuit className="h-5 w-5" />
                            AI Match Report
                        </DialogTitle>
                        <DialogDescription>
                            {aiReportModal?.candidate_name} — {aiReportModal?.job_title}
                        </DialogDescription>
                    </DialogHeader>
                    {aiReportModal?.ai_match_report && (
                        <div className="space-y-4 mt-2">
                            <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 flex justify-between items-center">
                                <span className="font-medium text-sm text-purple-900">System Fit Score</span>
                                <Badge variant={aiReportModal.match_score && aiReportModal.match_score >= 7 ? "default" : "secondary"}>
                                    {aiReportModal.match_score}/10
                                </Badge>
                            </div>
                            
                            <div>
                                <h4 className="text-sm font-semibold mb-1 text-muted-foreground">Summary</h4>
                                <p className="text-sm text-foreground leading-relaxed">
                                    {aiReportModal.ai_match_report.summary || aiReportModal.ai_match_report.Summary}
                                </p>
                            </div>

                            {(aiReportModal.ai_match_report.matched_skills || aiReportModal.ai_match_report.Matched_Skills) && (
                                <div>
                                    <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Matched Skills</h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(aiReportModal.ai_match_report.matched_skills || aiReportModal.ai_match_report.Matched_Skills).map((skill: string) => (
                                            <Badge key={skill} variant="secondary" className="bg-emerald-100 text-emerald-800 text-[10px]">
                                                {skill}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {(aiReportModal.ai_match_report.missing_skills || aiReportModal.ai_match_report.Missing_Skills) && (
                                <div>
                                    <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Missing Skills</h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(aiReportModal.ai_match_report.missing_skills || aiReportModal.ai_match_report.Missing_Skills).map((skill: string) => (
                                            <Badge key={skill} variant="outline" className="text-muted-foreground border-dashed text-[10px]">
                                                {skill}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
