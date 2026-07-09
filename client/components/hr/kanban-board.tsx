"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DecisionModal } from "./decision-modal";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, BrainCircuit, CalendarClock, UserCheck } from "lucide-react";

interface Candidate {
    id: string;
    name: string;
    job_title: string;
    status: "APPLIED" | "RANKED" | "SCHEDULED" | "INTERVIEWED";
    match_score?: number;
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

    const { data: candidates, isLoading } = useQuery<Candidate[]>({
        queryKey: ["pipeline"],
        queryFn: async () => {
            const response = await api.get("/candidates");
            return response.data;
        },
    });

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
                                            }
                                        }}
                                        className={`shadow-sm border transition-all hover:shadow-ambient hover:-translate-y-0.5 cursor-pointer
                      ${candidate.status === "INTERVIEWED" ? "border-primary/50 bg-primary/5" : ""}
                    `}
                                    >
                                        <CardHeader className="p-4 pb-2 space-y-1">
                                            <div className="flex justify-between items-start">
                                                <span className="font-medium text-sm leading-tight">
                                                    {candidate.name}
                                                </span>
                                                {candidate.match_score !== undefined && (
                                                    <Badge
                                                        variant={candidate.match_score >= 8 ? "default" : "secondary"}
                                                        className="ml-2 shrink-0"
                                                    >
                                                        {candidate.match_score}/10
                                                    </Badge>
                                                )}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-0">
                                            <p className="text-xs text-muted-foreground line-clamp-1">
                                                {candidate.job_title}
                                            </p>
                                            {candidate.status === "INTERVIEWED" && (
                                                <div className="mt-3 text-xs font-medium text-primary">
                                                    Click to review feedback →
                                                </div>
                                            )}
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
        </div>
    );
}
