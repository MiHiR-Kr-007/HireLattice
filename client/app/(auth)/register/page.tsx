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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const registerSchema = z.object({
    name: z.string().min(2, { message: "Name must be at least 2 characters." }),
    email: z.string().email({ message: "Please enter a valid email address." }),
    password: z.string().min(6, { message: "Password must be at least 6 characters." }),
    role: z.enum(["HR", "INTERVIEWER", "CANDIDATE"]),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            role: "CANDIDATE",
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
                // Not logged in, stay on register page
            }
        };
        checkAuth();
    }, [router]);

    const onSubmit = async (data: RegisterFormValues) => {
        setIsLoading(true);
        try {
            const response = await api.post("/auth/register", data);

            const { user } = response.data;
            const userRole = user.role; 

            localStorage.setItem("userRole", userRole);

            toast.success("Registration successful! Redirecting...");

            if (userRole === "HR") router.push("/hr");
            else if (userRole === "INTERVIEWER") router.push("/interviewer");
            else if (userRole === "CANDIDATE") router.push("/candidate");
            else router.push("/"); 

        } catch (error: any) {
            toast.error(
                error.response?.data?.error || "Registration failed. Please try again."
            );
        } finally {
            setIsLoading(false);
        }
    };

    const onGoogleSuccess = async (credentialResponse: any) => {
        setIsLoading(true);
        try {
            const currentRole = form.getValues().role;
            const response = await api.post("/auth/google", {
                idToken: credentialResponse.credential,
                targetRole: currentRole
            });
            const { user } = response.data;
            const userRole = user.role; 
            localStorage.setItem("userRole", userRole);
            toast.success("Google Authentication successful! Redirecting...");
            
            if (userRole === "HR") router.push("/hr");
            else if (userRole === "INTERVIEWER") router.push("/interviewer");
            else if (userRole === "CANDIDATE") router.push("/candidate");
            else router.push("/"); 
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Google auth failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4">
            <Card className="w-full max-w-sm shadow-ambient border-none">
                <CardHeader className="text-center space-y-2">
                    <CardTitle className="text-3xl font-bold tracking-tight text-primary">
                        Join HireLattice
                    </CardTitle>
                    <CardDescription>
                        Create your account to get started.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Full Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="John Doe" {...field} disabled={isLoading} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
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
                            <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Role</FormLabel>
                                        <Select disabled={isLoading} onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a role" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="CANDIDATE">Candidate</SelectItem>
                                                <SelectItem value="INTERVIEWER">Interviewer</SelectItem>
                                                <SelectItem value="HR">HR Admin</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Registering...
                                    </>
                                ) : (
                                    "Sign Up"
                                )}
                            </Button>
                        </form>
                    </Form>
                    
                    <div className="mt-6 flex items-center justify-center">
                        <GoogleLogin
                            onSuccess={onGoogleSuccess}
                            onError={() => toast.error("Google auth failed")}
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <p className="text-sm text-muted-foreground">
                        Already have an account?{" "}
                        <Link href="/login" className="text-primary hover:underline">
                            Log in
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
