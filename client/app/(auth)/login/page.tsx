"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";
import { GoogleLogin } from "@react-oauth/google";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email address." }),
    password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [pendingGoogleToken, setPendingGoogleToken] = useState<string | null>(null);
    const [selectedRole, setSelectedRole] = useState<string>("CANDIDATE");

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await api.get("/auth/me");
                const role = res.data.user.role;
                if (role === "HR") router.push("/hr");
                else if (role === "INTERVIEWER") router.push("/interviewer");
                else if (role === "CANDIDATE") router.push("/candidate");
            } catch {
                // Not logged in, stay on login page
            }
        };
        checkAuth();
    }, [router]);

    const onSubmit = async (data: LoginFormValues) => {
        setIsLoading(true);
        try {
            const response = await api.post("/auth/login", data);

            const { user } = response.data;
            const userRole = user.role; 

            localStorage.setItem("userRole", userRole);

            toast.success("Login successful! Redirecting...");

            if (userRole === "HR") router.push("/hr");
            else if (userRole === "INTERVIEWER") router.push("/interviewer");
            else if (userRole === "CANDIDATE") router.push("/candidate");
            else router.push("/"); 

        } catch (error: any) {
            toast.error(
                error.response?.data?.error || "Invalid credentials. Please try again."
            );
        } finally {
            setIsLoading(false);
        }
    };

    const onGoogleSuccess = async (credentialResponse: any) => {
        setIsLoading(true);
        try {
            const response = await api.post("/auth/google", {
                idToken: credentialResponse.credential
            });
            const { user } = response.data;
            const userRole = user.role; 
            localStorage.setItem("userRole", userRole);
            toast.success("Login successful! Redirecting...");
            
            if (userRole === "HR") router.push("/hr");
            else if (userRole === "INTERVIEWER") router.push("/interviewer");
            else if (userRole === "CANDIDATE") router.push("/candidate");
            else router.push("/"); 
        } catch (error: any) {
            if (error.response?.status === 422) {
                setPendingGoogleToken(credentialResponse.credential);
                toast.info("Please select a role to complete your registration.");
            } else {
                toast.error(error.response?.data?.error || "Google login failed. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleCompleteGoogleRegistration = async () => {
        if (!pendingGoogleToken) return;
        setIsLoading(true);
        try {
            const response = await api.post("/auth/google", {
                idToken: pendingGoogleToken,
                targetRole: selectedRole
            });
            const { user } = response.data;
            const userRole = user.role; 
            localStorage.setItem("userRole", userRole);
            toast.success("Registration successful! Redirecting...");
            
            if (userRole === "HR") router.push("/hr");
            else if (userRole === "INTERVIEWER") router.push("/interviewer");
            else if (userRole === "CANDIDATE") router.push("/candidate");
            else router.push("/"); 
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Google registration failed. Please try again.");
        } finally {
            setIsLoading(false);
            setPendingGoogleToken(null);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative">
            <div className="absolute top-4 right-4">
                <ThemeToggle />
            </div>
            <Card className="w-full max-w-sm shadow-ambient border-none">
                <CardHeader className="text-center space-y-2">
                    <CardTitle className="text-3xl font-bold tracking-tight text-primary">
                        HireLattice
                    </CardTitle>
                    <CardDescription>
                        Enter your credentials to access your dashboard.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="name@company.com" {...field} disabled={isLoading} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Authenticating...
                                    </>
                                ) : (
                                    "Sign In"
                                )}
                            </Button>
                        </form>
                    </Form>
                    
                    <div className="mt-6 flex items-center justify-center">
                        <GoogleLogin
                            onSuccess={onGoogleSuccess}
                            onError={() => toast.error("Google login failed")}
                        />
                    </div>
                    
                    <div className="mt-6 text-center text-sm">
                        <span className="text-muted-foreground">Don't have an account? </span>
                        <Link href="/register" className="text-primary hover:underline font-medium">
                            Sign up
                        </Link>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={!!pendingGoogleToken} onOpenChange={(open) => !open && setPendingGoogleToken(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Complete Registration</DialogTitle>
                        <DialogDescription>
                            We noticed you're a new user! Please select your role to continue.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col space-y-3 py-4">
                        <Button 
                            variant={selectedRole === "CANDIDATE" ? "default" : "outline"} 
                            onClick={() => setSelectedRole("CANDIDATE")}
                            className="justify-start"
                        >
                            Candidate (Looking for a job)
                        </Button>
                        <Button 
                            variant={selectedRole === "INTERVIEWER" ? "default" : "outline"} 
                            onClick={() => setSelectedRole("INTERVIEWER")}
                            className="justify-start"
                        >
                            Interviewer (Conducting technical interviews)
                        </Button>
                        <Button 
                            variant={selectedRole === "HR" ? "default" : "outline"} 
                            onClick={() => setSelectedRole("HR")}
                            className="justify-start"
                        >
                            HR Manager (Managing jobs & hiring)
                        </Button>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPendingGoogleToken(null)} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button onClick={handleCompleteGoogleRegistration} disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Create Account
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}