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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Sparkles } from "lucide-react";
import { useEffect } from "react";

const jobSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    department: z.string().min(2, "Department is required"),
    description: z.string().min(50, "Provide a detailed description for the AI matching engine (min 50 chars)"),
    selectAllInterviewers: z.boolean(),
    interviewerIds: z.array(z.number()),
});

type JobFormValues = z.infer<typeof jobSchema>;

export function JobPostingForm({ onSuccess }: { onSuccess?: () => void }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [interviewers, setInterviewers] = useState<{ id: number, name: string, email: string }[]>([]);

    useEffect(() => {
        const fetchInterviewers = async () => {
            try {
                const res = await api.get("/jobs/interviewers/all");
                setInterviewers(res.data);
            } catch (e) {
                console.error("Failed to fetch interviewers", e);
            }
        };
        fetchInterviewers();
    }, []);

    const form = useForm<JobFormValues>({
        resolver: zodResolver(jobSchema),
        defaultValues: { title: "", department: "", description: "", selectAllInterviewers: true, interviewerIds: [] },
    });

    const selectAll = form.watch("selectAllInterviewers");

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

                        <div className="space-y-4 border rounded-md p-4 bg-muted/20">
                            <h3 className="font-semibold text-lg tracking-tight">Assign Interviewers</h3>
                            <FormField
                                control={form.control}
                                name="selectAllInterviewers"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>
                                                Assign All Interviewers
                                            </FormLabel>
                                            <FormDescription>
                                                Automatically adds all current and future interviewers to this job's pool.
                                            </FormDescription>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            {!selectAll && (
                                <FormField
                                    control={form.control}
                                    name="interviewerIds"
                                    render={() => (
                                        <FormItem>
                                            <div className="mb-4">
                                                <FormLabel className="text-base">Select Specific Interviewers</FormLabel>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md bg-background">
                                                {interviewers.map((inv) => (
                                                    <FormField
                                                        key={inv.id}
                                                        control={form.control}
                                                        name="interviewerIds"
                                                        render={({ field }) => {
                                                            return (
                                                                <FormItem
                                                                    key={inv.id}
                                                                    className="flex flex-row items-start space-x-3 space-y-0"
                                                                >
                                                                    <FormControl>
                                                                        <Checkbox
                                                                            checked={field.value?.includes(inv.id)}
                                                                            onCheckedChange={(checked) => {
                                                                                return checked
                                                                                    ? field.onChange([...(field.value || []), inv.id])
                                                                                    : field.onChange(
                                                                                        field.value?.filter(
                                                                                            (value) => value !== inv.id
                                                                                        )
                                                                                    )
                                                                            }}
                                                                        />
                                                                    </FormControl>
                                                                    <FormLabel className="font-normal cursor-pointer">
                                                                        {inv.name} <span className="text-xs text-muted-foreground">({inv.email})</span>
                                                                    </FormLabel>
                                                                </FormItem>
                                                            )
                                                        }}
                                                    />
                                                ))}
                                                {interviewers.length === 0 && <p className="text-sm text-muted-foreground p-2">No interviewers found.</p>}
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>
                        <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : "Publish Job"}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}