"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UploadCloud } from "lucide-react";

export function ApplicationForm({ onSuccess }: { onSuccess: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [jobId, setJobId] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !jobId) {
            toast.error("Please provide both a Job ID and a PDF resume.");
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData();
        formData.append("resume", file);
        formData.append("jobId", jobId);

        try {
            await api.post("/applications/apply", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            toast.success("Application submitted! Our AI is reviewing your resume.");
            onSuccess();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to submit application.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="shadow-ambient border-none max-w-xl mx-auto mt-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <UploadCloud className="h-5 w-5 text-primary" />
                    Submit Application
                </CardTitle>
                <CardDescription>
                    Upload your PDF resume. Our system will automatically parse and rank your application.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label>Job ID</Label>
                        <Input 
                            value={jobId} 
                            onChange={(e) => setJobId(e.target.value)} 
                            placeholder="Enter the Job ID you are applying for" 
                            disabled={isSubmitting}
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Resume (PDF)</Label>
                        <Input 
                            type="file" 
                            accept=".pdf" 
                            onChange={(e) => setFile(e.target.files?.[0] || null)} 
                            disabled={isSubmitting}
                            className="cursor-pointer file:text-primary file:bg-primary/10 file:border-0 file:rounded-md file:px-4 file:py-1 file:mr-4 hover:file:bg-primary/20"
                        />
                    </div>

                    <Button type="submit" disabled={isSubmitting} className="w-full">
                        {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : "Apply Now"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}