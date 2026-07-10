"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApplicationForm } from "@/components/candidate/application-form";
import { StatusTracker } from "@/components/candidate/status-tracker";

export default function CandidateDashboard() {
    const [activeTab, setActiveTab] = useState("status");

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Candidate Portal</h1>
                <p className="text-muted-foreground mt-1">
                    Track your application status and manage your schedule.
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                    <TabsTrigger value="status">My Status</TabsTrigger>
                    <TabsTrigger value="apply">New Application</TabsTrigger>
                </TabsList>
                
                <TabsContent value="status" className="mt-0">
                    <StatusTracker />
                </TabsContent>
                
                <TabsContent value="apply" className="mt-0">
                    <ApplicationForm onSuccess={() => setActiveTab("status")} />
                </TabsContent>
            </Tabs>
        </div>
    );
}