"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Briefcase, UploadCloud, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Job {
    id: number;
    title: string;
    description: string;
    created_at: string;
}

interface Application {
    job_id: number;
    status: string;
}

export function OpenJobs({ onSuccess }: { onSuccess: () => void }) {
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data: jobs, isLoading: isJobsLoading } = useQuery<Job[]>({
        queryKey: ["open-jobs"],
        queryFn: async () => {
            const response = await api.get("/jobs");
            return response.data;
        },
    });

    const { data: applications, isLoading: isAppsLoading } = useQuery<Application[]>({
        queryKey: ["my-applications"],
        queryFn: async () => {
            const response = await api.get("/applications/me");
            return response.data;
        },
    });

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !selectedJob) {
            toast.error("Please provide a PDF resume.");
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData();
        formData.append("resume", file);
        formData.append("jobId", selectedJob.id.toString());

        try {
            await api.post("/applications/apply", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            toast.success("Application submitted! Our AI is reviewing your resume.");
            setSelectedJob(null);
            setFile(null);
            onSuccess();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to submit application.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isJobsLoading || isAppsLoading) {
        return (
            <div className="space-y-4 mt-6">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-xl" />
                ))}
            </div>
        );
    }

    const appliedJobIds = new Set(applications?.map(app => app.job_id) || []);

    return (
        <div className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {jobs?.map((job) => {
                    const isApplied = appliedJobIds.has(job.id);
                    const applicationStatus = applications?.find(app => app.job_id === job.id)?.status;

                    return (
                        <Card key={job.id} className="shadow-sm border transition-all hover:shadow-ambient hover:-translate-y-1">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-xl">{job.title}</CardTitle>
                                    {isApplied && (
                                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                            <CheckCircle2 className="h-3 w-3 mr-1" /> Applied
                                        </Badge>
                                    )}
                                </div>
                                <CardDescription className="text-xs">
                                    Posted {new Date(job.created_at).toLocaleDateString()}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-muted-foreground line-clamp-3">
                                    {job.description}
                                </p>
                                <Button 
                                    className="w-full" 
                                    variant={isApplied ? "outline" : "default"}
                                    onClick={() => setSelectedJob(job)}
                                >
                                    {isApplied ? `View Status: ${applicationStatus}` : "View & Apply"}
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
                {jobs?.length === 0 && (
                    <div className="col-span-full text-center p-12 border-2 border-dashed rounded-xl text-muted-foreground">
                        <Briefcase className="h-10 w-10 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-medium">No open jobs</h3>
                        <p>Check back later for new opportunities.</p>
                    </div>
                )}
            </div>

            <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
                <DialogContent className="max-w-xl shadow-ambient border-none">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">{selectedJob?.title}</DialogTitle>
                        <DialogDescription>
                            Job Details & Application Form
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6 mt-4">
                        <div className="bg-muted/30 p-4 rounded-xl border max-h-[300px] overflow-y-auto">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                {selectedJob?.description}
                            </p>
                        </div>

                        {selectedJob && appliedJobIds.has(selectedJob.id) ? (
                            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-3 text-emerald-800">
                                <CheckCircle2 className="h-6 w-6" />
                                <div>
                                    <h4 className="font-semibold">Already Applied</h4>
                                    <p className="text-sm">You have already submitted an application for this role. Check the 'My Status' tab for updates.</p>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleApply} className="space-y-4 bg-muted/10 p-4 rounded-xl border">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <UploadCloud className="h-4 w-4 text-primary" />
                                        Upload your Resume (PDF)
                                    </Label>
                                    <Input 
                                        type="file" 
                                        accept=".pdf" 
                                        onChange={(e) => setFile(e.target.files?.[0] || null)} 
                                        disabled={isSubmitting}
                                        className="cursor-pointer file:text-primary file:bg-primary/10 file:border-0 file:rounded-md file:px-4 file:py-1 file:mr-4 hover:file:bg-primary/20"
                                    />
                                </div>
                                <Button type="submit" disabled={isSubmitting || !file} className="w-full">
                                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Submit Application"}
                                </Button>
                            </form>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
