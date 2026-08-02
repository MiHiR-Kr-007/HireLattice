"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Search, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function SemanticSearch() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a resume PDF first");
      return;
    }

    setIsLoading(true);
    setResults([]);

    const formData = new FormData();
    formData.append("resume", file);

    try {
      const response = await api.post("/jobs/search-semantic", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResults(response.data.matches || []);
      toast.success("Semantic search completed!");
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || "Failed to perform semantic search");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Semantic Job Match</CardTitle>
          <CardDescription>
            Upload your resume and our AI will find the best matching open positions based on your skills and experience.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resume-upload">Resume (PDF)</Label>
              <Input
                id="resume-upload"
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" disabled={isLoading || !file} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Resume...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Find Matching Jobs
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">Top Recommended Roles</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {results.map((match, index) => (
              <Card key={index} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-primary" />
                      Job #{match.job_id}
                    </span>
                    <Badge variant="secondary" className="ml-auto">
                      {(match.similarity * 100).toFixed(1)}% Match
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {match.job_description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}