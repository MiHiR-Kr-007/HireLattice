"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ClipboardCheck } from "lucide-react";

const feedbackSchema = z.object({
    technical_notes: z.string().min(10, "Please provide detailed technical notes."),
    communication_notes: z.string().min(10, "Please provide communication notes."),
    final_recommendation: z.enum(["Strong Hire", "Hire", "Leaning Hire", "Leaning No Hire", "No Hire"]),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

interface FeedbackModalProps {
    interviewId: string | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function FeedbackModal({ interviewId, isOpen, onClose, onSuccess }: FeedbackModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<FeedbackFormValues>({
        resolver: zodResolver(feedbackSchema),
        defaultValues: {
            technical_notes: "",
            communication_notes: "",
            final_recommendation: undefined,
        },
    });

    const onSubmit = async (data: FeedbackFormValues) => {
        setIsSubmitting(true);
        try {
            await api.post(`/interviews/${interviewId}/feedback`, data);
            toast.success("Feedback submitted successfully!");
            form.reset();
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to submit feedback.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl shadow-ambient border-none">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ClipboardCheck className="h-5 w-5 text-primary" />
                        Submit Interview Feedback
                    </DialogTitle>
                    <DialogDescription>
                        Your structured feedback will be compiled with the AI resume analysis for HR review.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
                        <FormField
                            control={form.control}
                            name="technical_notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Technical Assessment</FormLabel>
                                    <FormControl>
                                        <Textarea 
                                            placeholder="Detail their technical proficiency, problem-solving skills, etc." 
                                            className="h-24 resize-none" 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="communication_notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Communication & Culture</FormLabel>
                                    <FormControl>
                                        <Textarea 
                                            placeholder="How well did they communicate? Culture fit?" 
                                            className="h-24 resize-none" 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="final_recommendation"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Final Recommendation</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a recommendation" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Strong Hire">Strong Hire</SelectItem>
                                            <SelectItem value="Hire">Hire</SelectItem>
                                            <SelectItem value="Leaning Hire">Leaning Hire</SelectItem>
                                            <SelectItem value="Leaning No Hire">Leaning No Hire</SelectItem>
                                            <SelectItem value="No Hire">No Hire</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Submit Feedback"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}