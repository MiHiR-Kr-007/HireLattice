"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ServerCrash, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function ServerErrorPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-md text-center space-y-8"
            >
                <div className="relative w-72 h-72 mx-auto drop-shadow-2xl">
                    <Image
                        src="/images/500.png"
                        alt="Character trying to fix a broken server"
                        fill
                        className="object-contain"
                        priority
                    />
                </div>
                
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 text-destructive font-medium text-sm mb-2">
                        <ServerCrash className="w-4 h-4" />
                        <span>Error 500</span>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
                        Server Malfunction
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Our servers just blew a fuse! We're already working on fixing it. Please try again in a few moments.
                    </p>
                </div>

                <div className="pt-4">
                    <Button asChild size="lg" className="shadow-ambient rounded-full">
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Return to Dashboard
                        </Link>
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}
