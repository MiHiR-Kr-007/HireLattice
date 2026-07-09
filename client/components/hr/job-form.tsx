"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "@/lib/api";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Sparkles } from "lucide-react";

const jobSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    department: z.string().min(2, "Department is required"),
    description: z.string().min(50, "Provide a detailed description for the AI matching engine (min 50 chars)"),
});

type JobFormValues = z.infer<typeof jobSchema>;

export function JobPostingForm({ onSuccess }: { onSuccess?: () => void }) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<JobFormValues>({
        resolver: zodResolver(jobSchema),
        defaultValues: { title: "", department: "", description: "" },
    });

    const onSubmit = async (data: JobFormValues) => {
        setIsSubmitting(true);
        try {
            // Calls POST /api/jobs route
            await api.post("/jobs", data);
            toast.success("Job posted! AI is currently generating embeddings.");
            form.reset();
            if (onSuccess) onSuccess();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to post job");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="shadow-ambient border-none max-w-2xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Create AI-Powered Job Posting
                </CardTitle>
                <CardDescription>
                    Detailed descriptions yield better AI resume matching and ranking.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Job Title</FormLabel>
                                        <FormControl><Input placeholder="e.g. Senior Backend Engineer" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="department"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Department</FormLabel>
                                        <FormControl><Input placeholder="e.g. Engineering" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Job Description & Requirements</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Paste the full job description, required skills, and responsibilities here..."
                                            className="min-h-[200px] resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : "Publish Job"}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}