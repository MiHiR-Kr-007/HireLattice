"use client";

import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function AvailabilityManager() {
    const [date, setDate] = useState<Date>();
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [isRecurring, setIsRecurring] = useState(false);
    const [weeksToRepeat, setWeeksToRepeat] = useState("4");
    const [timezoneIana, setTimezoneIana] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [calendarLinked, setCalendarLinked] = useState<boolean | null>(null);
    const [isLinking, setIsLinking] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get("calendarLinked") === "true") {
            setCalendarLinked(true);
            toast.success("Google Calendar connected successfully!");
            window.history.replaceState({}, document.title, window.location.pathname);
        } else {
            api.get("/auth/me").then(res => {
                setCalendarLinked(res.data.user.calendarLinked);
            }).catch(console.error);
        }
    }, []);

    const handleLinkCalendar = async () => {
        setIsLinking(true);
        try {
            const res = await api.get("/auth/google/calendar/link");
            window.location.href = res.data.url;
        } catch (error) {
            toast.error("Failed to initiate calendar linking.");
            setIsLinking(false);
        }
    };

    const handleSubmit = async () => {
        if (!date || !startTime || !endTime) {
            toast.error("Please select a date, start time, and end time.");
            return;
        }

        setIsSubmitting(true);
        try {
            const [startHours, startMinutes] = startTime.split(":");
            const slotStartDateTime = new Date(date);
            slotStartDateTime.setHours(parseInt(startHours, 10), parseInt(startMinutes, 10), 0, 0);

            const [endHours, endMinutes] = endTime.split(":");
            const slotEndDateTime = new Date(date);
            slotEndDateTime.setHours(parseInt(endHours, 10), parseInt(endMinutes, 10), 0, 0);

            if (slotEndDateTime <= slotStartDateTime) {
                toast.error("End time must be after start time.");
                setIsSubmitting(false);
                return;
            }

            await api.post("/scheduling/slots", {
                start_time: slotStartDateTime.toISOString(),
                end_time: slotEndDateTime.toISOString(),
                timezone_iana: timezoneIana,
                is_recurring: isRecurring,
                weeks_to_repeat: isRecurring ? parseInt(weeksToRepeat, 10) : 1
            });

            toast.success("Availability slot(s) registered successfully!");
            setDate(undefined);
            setStartTime("");
            setEndTime("");
            setIsRecurring(false);
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

                {calendarLinked === false && (
                    <div className="bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 p-4 rounded-lg flex items-center justify-between border border-orange-200 dark:border-orange-800/30">
                        <div className="space-y-1">
                            <p className="font-medium text-sm">Google Calendar Not Linked</p>
                            <p className="text-xs opacity-90">Link your calendar so the system can schedule Google Meet interviews directly on your account.</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleLinkCalendar} disabled={isLinking} className="shrink-0 bg-white dark:bg-black">
                            {isLinking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Link Calendar"}
                        </Button>
                    </div>
                )}
                {calendarLinked === true && (
                    <div className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 p-3 rounded-lg flex items-center gap-2 border border-green-200 dark:border-green-800/30 text-sm">
                        <span>✅</span>
                        <span className="font-medium">Connected to Google Calendar</span>
                    </div>
                )}

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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Start Time</Label>
                        <Input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>End Time</Label>
                        <Input
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="w-full"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select value={timezoneIana} onValueChange={setTimezoneIana}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Timezone" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                            {Intl.supportedValuesOf('timeZone').map(tz => (
                                <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                    <div className="space-y-0.5">
                        <Label>Recurring Slot</Label>
                        <p className="text-sm text-muted-foreground">Repeat this availability weekly</p>
                    </div>
                    <Switch
                        checked={isRecurring}
                        onCheckedChange={setIsRecurring}
                    />
                </div>

                {isRecurring && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <Label>Weeks to Repeat</Label>
                        <Select value={weeksToRepeat} onValueChange={setWeeksToRepeat}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select weeks" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="2">2 weeks</SelectItem>
                                <SelectItem value="4">4 weeks (1 month)</SelectItem>
                                <SelectItem value="8">8 weeks (2 months)</SelectItem>
                                <SelectItem value="12">12 weeks (3 months)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Add to Matchmaker Pool"}
                </Button>
            </CardContent>
        </Card>
    );
}