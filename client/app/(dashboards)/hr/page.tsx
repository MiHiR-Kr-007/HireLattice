"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JobPostingForm } from "@/components/hr/job-form";
import { KanbanBoard } from "@/components/hr/kanban-board";

export default function HRDashboard() {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
                <p className="text-muted-foreground mt-1">
                    Manage your active pipelines and publish new job openings.
                </p>
            </div>

            <Tabs defaultValue="pipeline" className="w-full">
                <TabsList className="grid w-full max-w-[400px] grid-cols-2 mb-8">
                    <TabsTrigger value="pipeline">Active Pipeline</TabsTrigger>
                    <TabsTrigger value="post-job">Post New Job</TabsTrigger>
                </TabsList>

                <TabsContent value="pipeline" className="mt-0">
                    <KanbanBoard /> 
                </TabsContent>

                <TabsContent value="post-job" className="mt-0">
                    <JobPostingForm />
                </TabsContent>
            </Tabs>

        </div>
    );
}