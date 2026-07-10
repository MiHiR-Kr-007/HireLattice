"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AvailabilityManager } from "@/components/interviewer/availability-manager";
import { UpcomingQueue } from "@/components/interviewer/upcoming-queue";

export default function InterviewerDashboard() {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Interviewer Portal</h1>
                <p className="text-muted-foreground mt-1">
                    Manage your upcoming interviews and open availability slots.
                </p>
            </div>

            <Tabs defaultValue="upcoming" className="w-full">
                <TabsList className="grid w-full max-w-[400px] grid-cols-2 mb-8">
                    <TabsTrigger value="upcoming">Upcoming Interviews</TabsTrigger>
                    <TabsTrigger value="availability">Manage Availability</TabsTrigger>
                </TabsList>
                
                <TabsContent value="upcoming" className="mt-0">
                    <UpcomingQueue /> 
                </TabsContent>
                
                <TabsContent value="availability" className="mt-0">
                    <AvailabilityManager />
                </TabsContent>
            </Tabs>

        </div>
    );
}