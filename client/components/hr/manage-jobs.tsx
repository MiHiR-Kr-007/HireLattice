"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Users, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

export function ManageJobs() {
    const [selectedJob, setSelectedJob] = useState<number | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: jobs, isLoading: isJobsLoading } = useQuery({
        queryKey: ["jobs"],
        queryFn: async () => {
            const res = await api.get("/jobs");
            return res.data;
        }
    });

    const openEditInterviewers = (jobId: number) => {
        setSelectedJob(jobId);
        setIsDialogOpen(true);
    };

    const closeJobMutation = useMutation({
        mutationFn: async (jobId: number) => {
            return api.put(`/jobs/${jobId}/status`, { status: "CLOSED" });
        },
        onSuccess: () => {
            toast.success("Job closed successfully");
            queryClient.invalidateQueries({ queryKey: ["jobs"] });
        },
        onError: () => {
            toast.error("Failed to close job");
        }
    });

    if (isJobsLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="space-y-4">
            {jobs?.length === 0 && <p className="text-muted-foreground text-center p-8">No open jobs found.</p>}
            {jobs?.map((job: any) => (
                <Card key={job.id} className="shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-xl">{job.title}</CardTitle>
                                <CardDescription className="line-clamp-2 mt-1">{job.description}</CardDescription>
                            </div>
                            <Badge variant="outline" className="shrink-0">{job.status}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-end mt-4 gap-2">
                            {job.status === 'OPEN' && (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => closeJobMutation.mutate(job.id)}
                                    disabled={closeJobMutation.isPending}
                                >
                                    {closeJobMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                                    Close Job
                                </Button>
                            )}
                            <Button variant="secondary" size="sm" onClick={() => openEditInterviewers(job.id)}>
                                <Users className="h-4 w-4 mr-2" />
                                Manage Interviewers
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}

            {selectedJob && (
                <EditInterviewersDialog
                    jobId={selectedJob}
                    isOpen={isDialogOpen}
                    onClose={() => {
                        setIsDialogOpen(false);
                        setSelectedJob(null);
                    }}
                />
            )}
        </div>
    );
}

function EditInterviewersDialog({ jobId, isOpen, onClose }: { jobId: number, isOpen: boolean, onClose: () => void }) {
    const queryClient = useQueryClient();
    
    const { data: allInterviewers, isLoading: isAllLoading } = useQuery({
        queryKey: ["allInterviewers"],
        queryFn: async () => {
            const res = await api.get("/jobs/interviewers/all");
            return res.data;
        }
    });

    const { data: jobInterviewers, isLoading: isJobLoading } = useQuery({
        queryKey: ["jobInterviewers", jobId],
        queryFn: async () => {
            const res = await api.get(`/jobs/${jobId}/interviewers`);
            return res.data;
        },
        enabled: isOpen
    });

    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [selectAll, setSelectAll] = useState(false);

    useEffect(() => {
        if (jobInterviewers) {
            setSelectedIds(jobInterviewers.map((i: any) => i.id));
        }
    }, [jobInterviewers]);

    const mutation = useMutation({
        mutationFn: async () => {
            return api.put(`/jobs/${jobId}/interviewers`, {
                interviewerIds: selectedIds,
                selectAllInterviewers: selectAll
            });
        },
        onSuccess: () => {
            toast.success("Interviewers updated successfully");
            queryClient.invalidateQueries({ queryKey: ["jobInterviewers", jobId] });
            onClose();
        },
        onError: () => {
            toast.error("Failed to update interviewers");
        }
    });

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Assign Interviewers to Job</DialogTitle>
                </DialogHeader>
                
                {isAllLoading || isJobLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2 border p-3 rounded-md bg-muted/20">
                            <Checkbox 
                                id="selectAll" 
                                checked={selectAll} 
                                onCheckedChange={(c) => setSelectAll(c === true)} 
                            />
                            <Label htmlFor="selectAll" className="cursor-pointer">Select All Interviewers</Label>
                        </div>
                        
                        {!selectAll && (
                            <ScrollArea className="h-64 border rounded-md p-2">
                                <div className="space-y-2">
                                    {allInterviewers?.map((inv: any) => (
                                        <div key={inv.id} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md">
                                            <Checkbox 
                                                id={`inv-${inv.id}`} 
                                                checked={selectedIds.includes(inv.id)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) setSelectedIds([...selectedIds, inv.id]);
                                                    else setSelectedIds(selectedIds.filter(id => id !== inv.id));
                                                }}
                                            />
                                            <Label htmlFor={`inv-${inv.id}`} className="cursor-pointer font-normal">
                                                {inv.name} <span className="text-xs text-muted-foreground">({inv.email})</span>
                                            </Label>
                                        </div>
                                    ))}
                                    {allInterviewers?.length === 0 && <p className="text-sm text-muted-foreground p-2">No interviewers found.</p>}
                                </div>
                            </ScrollArea>
                        )}

                        <div className="flex justify-end space-x-2 pt-4">
                            <Button variant="outline" onClick={onClose}>Cancel</Button>
                            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
