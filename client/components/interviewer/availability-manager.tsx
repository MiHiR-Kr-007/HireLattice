"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function AvailabilityManager() {
    const [date, setDate] = useState<Date>();
    const [time, setTime] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!date || !time) {
            toast.error("Please select both a date and a time.");
            return;
        }

        setIsSubmitting(true);
        try {
            const [hours, minutes] = time.split(":");
            const slotDateTime = new Date(date);
            slotDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
            
            // Assume 1 hour interview slot for now
            const endDateTime = new Date(slotDateTime);
            endDateTime.setHours(endDateTime.getHours() + 1);

            const timezoneIana = Intl.DateTimeFormat().resolvedOptions().timeZone;

            await api.post("/scheduling/slots", {
                start_time: slotDateTime.toISOString(),
                end_time: endDateTime.toISOString(),
                timezone_iana: timezoneIana,
                is_recurring: false
            });

            toast.success("Availability slot registered successfully!");
            setDate(undefined);
            setTime("");
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to register slot. It might overlap with an existing one.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="shadow-ambient border-none max-w-xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Register Availability
                </CardTitle>
                <CardDescription>
                    Add open slots to your calendar. The Matchmaker engine will automatically assign ranked candidates to these times.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Select Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    disabled={(currentDate) => currentDate < new Date(new Date().setHours(0, 0, 0, 0))}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-2">
                        <Label>Select Time</Label>
                        <Input 
                            type="time" 
                            value={time} 
                            onChange={(e) => setTime(e.target.value)} 
                            className="w-full"
                        />
                    </div>
                </div>

                <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Add to Matchmaker Pool"}
                </Button>
            </CardContent>
        </Card>
    );
}