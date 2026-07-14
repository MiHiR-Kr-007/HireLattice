"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OpenJobs } from "@/components/candidate/open-jobs";
import { StatusTracker } from "@/components/candidate/status-tracker";

export default function CandidateDashboard() {
    const [activeTab, setActiveTab] = useState("jobs");

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Candidate Portal</h1>
                <p className="text-muted-foreground mt-1">
                    Find your next opportunity and track your application status.
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                    <TabsTrigger value="jobs">Available Jobs</TabsTrigger>
                    <TabsTrigger value="status">My Applications</TabsTrigger>
                </TabsList>
                
                <TabsContent value="jobs" className="mt-0">
                    <OpenJobs onSuccess={() => setActiveTab("status")} />
                </TabsContent>
                
                <TabsContent value="status" className="mt-0">
                    <StatusTracker />
                </TabsContent>
            </Tabs>
        </div>
    );
}